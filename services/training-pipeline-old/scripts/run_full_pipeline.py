#!/usr/bin/env python3
"""
MASTER TRAINING & EXPORT PIPELINE

Runs complete end-to-end pipeline:
1. Fetch data from QuestDB (features + labels)
2. Train LightGBM models for multiple horizons (5min, 15min, 30min)
3. Export models to ONNX format for production
4. Validate models across 5 dimensions
5. Generate comprehensive validation reports

Usage:
    python scripts/run_full_pipeline.py

Optional arguments:
    --horizons 5 15 30              # Which horizons to train (default: 5, 15, 30)
    --start-date 2023-01-01         # Training start date (default: 2023-01-01)
    --skip-training                 # Skip training, only export/validate existing models
    --skip-validation               # Skip validation
"""

import sys
import argparse
import warnings
from pathlib import Path
from datetime import datetime
import logging

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from training_pipeline.utils.sql_loader import QuestDBLoader
from training_pipeline.pipelines.train_ensemble.models.lightgbm_trainer import (
    LightGBMTrainer,
)

warnings.filterwarnings("ignore")
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# 33 feature names from market_state_1m table
# Source: packages/schema/sql/schema/create_market_state_1m.sql
FEATURE_NAMES = [
    # Index Breadth (6 features)
    "pct_stocks_above_vwap",
    "pct_stocks_above_ema20",
    "weighted_return_top10",
    "advance_decline_ratio",
    "breadth_momentum_5m",
    "breadth_volatility",
    # NIFTY Future (9 features)
    "fut_price_vs_vwap",
    "fut_range_position",
    "fut_return_1m",
    "fut_return_5m",
    "fut_atr_percent",
    "fut_volume_zscore",
    "fut_oi_change",
    "fut_rsi_14",
    "fut_macd",
    # Options (11 features)
    "atm_iv",
    "atm_iv_change",
    "iv_skew",
    "gamma_atm",
    "vega_atm",
    "theta_atm",
    "pcr_oi",
    "pcr_volume",
    "max_pain_distance",
    "charm_atm",
    "vanna_atm",
    # Volatility (4 features)
    "india_vix",
    "realized_vol_5m",
    "realized_vol_15m",
    "vol_expansion_ratio",
    # Time Context (3 features)
    "minutes_from_open",
    "minutes_to_close",
    "day_of_week",
]


def train_horizon(
    horizon_minutes: int,
    loader: QuestDBLoader,
    start_date: datetime,
    end_date: datetime,
    model_dir: Path,
) -> dict[str, str] | None:
    """Train model for specific horizon"""
    logger.info(f"=" * 80)
    logger.info(f"TRAINING: {horizon_minutes}-minute horizon")
    logger.info(f"=" * 80)

    # 1. Load features
    features = loader.load_lightgbm_features(
        start_date=start_date,
        end_date=end_date,
    )
    logger.info(f"✅ Loaded {len(features)} feature rows")

    # 2. Load labels
    labels = loader.load_training_labels(
        start_date=start_date,
        end_date=end_date,
        horizon_minutes=horizon_minutes,
    )
    logger.info(f"✅ Loaded {len(labels)} labels")

    # 3. Merge
    data = features.merge(labels, on="timestamp", how="inner")
    logger.info(f"✅ Merged: {len(data)} rows")

    if len(data) == 0:
        logger.error(f"❌ No data after merge!")
        return None

    # 4. Prepare X, y
    feature_cols = [col for col in features.columns if col != "timestamp"]
    X = data[feature_cols]
    y = data["label"]

    logger.info(f"Features: {X.shape}, Labels: {y.shape}")
    logger.info(f"Label distribution:\n{y.value_counts().sort_index()}")

    # 5. Train
    trainer = LightGBMTrainer()

    logger.info("Training with walk-forward validation...")
    trainer.train(X, y)

    # 6. Save
    model_path = model_dir / f"lightgbm_{horizon_minutes}min.txt"
    oof_path = model_dir / f"oof_lightgbm_{horizon_minutes}min.parquet"

    trainer.save_model(model_path)
    trainer.save_oof_predictions(oof_path)

    logger.info(f"✅ Model: {model_path}")
    logger.info(f"✅ OOF: {oof_path}")

    return {
        "horizon": f"{horizon_minutes}min",
        "model_path": str(model_path),
        "oof_path": str(oof_path),
    }


def export_onnx(model_dir: Path, output_dir: Path, horizons: list[int]):
    """Export models to ONNX"""
    logger.info(f"\n" + "=" * 80)
    logger.info("EXPORTING TO ONNX")
    logger.info("=" * 80)

    # Import here to avoid circular dependency
    from export_onnx import export_all_horizons

    export_all_horizons(
        model_dir=model_dir,
        output_dir=output_dir,
        feature_names=FEATURE_NAMES,
        horizons=horizons,
    )


def validate_models(model_dir: Path, output_dir: Path, horizons: list[int]):
    """Run 5-dimension validation"""
    logger.info(f"\n" + "=" * 80)
    logger.info("VALIDATION: 5 DIMENSIONS")
    logger.info("=" * 80)

    # Import here to avoid circular dependency
    from validate_models import ModelValidator

    for horizon in horizons:
        model_path = model_dir / f"lightgbm_{horizon}min.txt"

        if not model_path.exists():
            logger.warning(f"⚠️  Model not found: {model_path}")
            continue

        logger.info(f"\nValidating {horizon}min model...")

        validator = ModelValidator(
            model_path=str(model_path),
            oof_predictions_path=str(model_dir / f"oof_lightgbm_{horizon}min.parquet"),
            feature_importance_path=str(
                model_dir / f"feature_importance_{horizon}min.csv"
            ),
            output_dir=str(output_dir / f"{horizon}min"),
        )

        validator.validate_all()


def main():
    parser = argparse.ArgumentParser(description="Full Training & Export Pipeline")
    parser.add_argument(
        "--horizons",
        nargs="+",
        type=int,
        default=[5, 15, 30],
        help="Prediction horizons in minutes (default: 5 15 30)",
    )
    parser.add_argument(
        "--start-date",
        type=str,
        default="2023-01-01",
        help="Training start date (default: 2023-01-01)",
    )
    parser.add_argument(
        "--skip-training",
        action="store_true",
        help="Skip training, only export/validate",
    )
    parser.add_argument(
        "--skip-validation", action="store_true", help="Skip validation"
    )

    args = parser.parse_args()

    # Paths
    base_dir = Path(__file__).parent.parent
    model_dir = base_dir / "data" / "06_models"
    onnx_dir = base_dir.parent.parent / "apps" / "algo-worker" / "models"
    validation_dir = base_dir / "data" / "08_reporting" / "validation"

    model_dir.mkdir(parents=True, exist_ok=True)
    onnx_dir.mkdir(parents=True, exist_ok=True)
    validation_dir.mkdir(parents=True, exist_ok=True)

    # Parse dates
    start_date = datetime.strptime(args.start_date, "%Y-%m-%d")
    end_date = datetime.now()

    logger.info("=" * 80)
    logger.info("FULL TRAINING & EXPORT PIPELINE")
    logger.info("=" * 80)
    logger.info(f"Horizons: {args.horizons}")
    logger.info(f"Training period: {start_date} to {end_date}")
    logger.info(f"Skip training: {args.skip_training}")
    logger.info(f"Skip validation: {args.skip_validation}")

    # PHASE 1: Training
    if not args.skip_training:
        loader = QuestDBLoader(
            connection_string="postgresql://admin:quest@localhost:8812/qdb",
        )

        for horizon in args.horizons:
            try:
                train_horizon(
                    horizon_minutes=horizon,
                    loader=loader,
                    start_date=start_date,
                    end_date=end_date,
                    model_dir=model_dir,
                )
            except Exception as e:
                logger.error(f"❌ Training failed for {horizon}min: {e}", exc_info=True)
    else:
        logger.info("⏭️  Skipping training (--skip-training)")

    # PHASE 2: ONNX Export
    try:
        export_onnx(model_dir, onnx_dir, args.horizons)
    except Exception as e:
        logger.error(f"❌ ONNX export failed: {e}", exc_info=True)

    # PHASE 3: Validation
    if not args.skip_validation:
        try:
            validate_models(model_dir, validation_dir, args.horizons)
        except Exception as e:
            logger.error(f"❌ Validation failed: {e}", exc_info=True)
    else:
        logger.info("⏭️  Skipping validation (--skip-validation)")

    # Final summary
    logger.info("\n" + "=" * 80)
    logger.info("PIPELINE COMPLETE")
    logger.info("=" * 80)
    logger.info(f"📁 Models: {model_dir}")
    logger.info(f"📁 ONNX: {onnx_dir}")
    logger.info(f"📁 Validation: {validation_dir}")
    logger.info("\n✅ All done!")


if __name__ == "__main__":
    main()
