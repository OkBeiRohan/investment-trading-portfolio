"""
Institutional training pipeline runner.

Entry point:
    python -m training_pipeline.runner --experiment-id <mongo_id> [--tier 2] [--dry-run]

Replaces the Kedro CLI.  Reads experiment config from MongoDB, loads data
from QuestDB via @repo/schema SQL, trains the requested tier(s), runs
quality gates, exports ONNX, and writes results back to MongoDB.

MLflow tracking is the primary experiment store; MongoDB receives a
dual-write summary for backward compatibility with the NestJS API.
"""

import argparse
import logging
import os
import sys
import time
import traceback
from typing import Optional

import mlflow

from .utils.mlflow_tracking import (
    init_mlflow,
    get_or_create_experiment,
    pipeline_run,
    tier_run,
)
from .utils.observability import (
    init_otel,
    setup_structured_logging,
    start_metrics_server,
    traced_stage,
    TRAINING_RUN_DURATION,
    TRAINING_RUN_TOTAL,
    update_gpu_metrics,
)

logger = logging.getLogger("training_pipeline")


def _resolve_schema_sql_dir() -> str:
    """Locate packages/schema/sql/ relative to this file."""
    here = os.path.dirname(os.path.abspath(__file__))
    candidate = os.path.normpath(
        os.path.join(here, "..", "..", "..", "..", "packages", "schema", "sql")
    )
    if os.path.isdir(candidate):
        return candidate
    return os.environ.get("SCHEMA_SQL_DIR", candidate)


def run_pipeline(
    experiment_id: str,
    tier_override: Optional[int] = None,
    dry_run: bool = False,
) -> None:
    from .utils.orchestrator import Orchestrator
    from .utils.data_loader import QuestDBTrainingLoader
    from .utils.data_validator import validate_features, validate_labels
    from .utils.quality_gate import check_quality_gate
    from .utils.drift_detector import detect_drift
    from .utils.model_registry import ModelRegistry
    from .utils.reporting import generate_report

    init_mlflow()

    orchestrator = Orchestrator()
    experiment = orchestrator.load_experiment(experiment_id)
    config = orchestrator.get_training_config(experiment)

    tier = tier_override if tier_override is not None else config["tier"]
    instrument_key = (config.get("instruments") or ["NSE_INDEX|Nifty 50"])[0]
    start_date = str(config.get("start_date", "2023-01-01"))
    end_date = str(config.get("end_date", "2026-03-17"))

    logger.info(
        "=== Training Pipeline: Tier %s | %s | %s–%s ===",
        tier, instrument_key, start_date, end_date,
    )

    if dry_run:
        logger.info("[DRY RUN] Config: %s", config)
        return

    pipeline_name = f"train_tier{tier}" if tier != "full" else "full_training"
    mongo_run_id = orchestrator.create_run(experiment_id, pipeline_name, config)

    loader = QuestDBTrainingLoader(schema_sql_dir=_resolve_schema_sql_dir())
    db = orchestrator._db
    registry = ModelRegistry(db)

    all_oof: dict = {}
    all_metrics: dict = {}
    artifact_paths: dict = {}

    mlflow_experiment_id = get_or_create_experiment(tier)
    pipeline_start = time.monotonic()

    with pipeline_run(
        experiment_id=mlflow_experiment_id,
        run_name=f"pipeline_{experiment_id}_{tier}",
        tier=tier,
        instrument_key=instrument_key,
        start_date=start_date,
        end_date=end_date,
        extra_tags={"mongo_experiment_id": experiment_id, "mongo_run_id": mongo_run_id},
    ):
        try:
            tiers_to_run = list(range(5)) if tier == "full" else [int(tier)]

            for t in tiers_to_run:
                orchestrator.update_stage(mongo_run_id, f"tier_{t}", "running")

                with tier_run(tier=t):
                    with traced_stage(f"train_tier_{t}", {"tier": t}):
                        result = _train_tier(
                            t, loader, config, instrument_key, start_date, end_date
                        )

                all_metrics[f"tier_{t}"] = result.get("metrics", {})
                if "oof" in result:
                    all_oof[f"tier_{t}"] = result["oof"]
                if "artifacts" in result:
                    artifact_paths.update(result["artifacts"])

                orchestrator.update_stage(
                    mongo_run_id, f"tier_{t}", "completed",
                    metrics=result.get("metrics"),
                )
                update_gpu_metrics()

            if len(tiers_to_run) > 1 or tier == "full":
                orchestrator.update_stage(mongo_run_id, "meta_learner", "running")
                with tier_run(tier="meta"):
                    with traced_stage("train_meta_learner"):
                        meta_result = _train_meta(all_oof, config)
                all_metrics["meta"] = meta_result.get("metrics", {})
                if "artifacts" in meta_result:
                    artifact_paths.update(meta_result["artifacts"])
                orchestrator.update_stage(
                    mongo_run_id, "meta_learner", "completed",
                    metrics=meta_result.get("metrics"),
                )

            flat_metrics = {}
            for k, v in all_metrics.items():
                if isinstance(v, dict):
                    for mk, mv in v.items():
                        if isinstance(mv, (int, float)):
                            flat_metrics[f"{k}_{mk}"] = mv
                elif isinstance(v, (int, float)):
                    flat_metrics[k] = v

            with traced_stage("quality_gate"):
                orchestrator.update_stage(mongo_run_id, "quality_gate", "running")
                gate_passed, gate_reason = check_quality_gate(
                    int(tier) if tier != "full" else 4, flat_metrics
                )
                orchestrator.update_stage(
                    mongo_run_id, "quality_gate",
                    "completed" if gate_passed else "failed",
                    metrics={"passed": gate_passed, "reason": gate_reason},
                )

            if not gate_passed:
                orchestrator.fail_run(
                    mongo_run_id, experiment_id,
                    f"Quality gate failed: {gate_reason}",
                )
                mlflow.set_tag("pipeline_status", "quality_gate_failed")
                duration = time.monotonic() - pipeline_start
                TRAINING_RUN_DURATION.labels(tier=str(tier), status="failed").observe(duration)
                TRAINING_RUN_TOTAL.labels(tier=str(tier), status="failed").inc()
                return

            with traced_stage("onnx_export"):
                orchestrator.update_stage(mongo_run_id, "onnx_export", "running")
                from .pipelines.onnx_export.nodes_export import export_all_models
                export_result = export_all_models(artifact_paths, config)
                if isinstance(export_result, dict):
                    artifact_paths.update(export_result)
                orchestrator.update_stage(mongo_run_id, "onnx_export", "completed")

            with traced_stage("model_registration"):
                artifacts = registry.register_artifacts(mongo_run_id, artifact_paths)

            report = generate_report(all_metrics, artifact_paths)

            if registry.should_promote(experiment_id, flat_metrics):
                primary_onnx = next(
                    (p for n, p in artifact_paths.items() if p.endswith(".onnx")),
                    None,
                )
                registry.promote(experiment_id, mongo_run_id, onnx_path=primary_onnx)
                mlflow.set_tag("promoted", "true")

            loggable_metrics = {
                k: float(v) for k, v in flat_metrics.items()
                if isinstance(v, (int, float))
            }
            mlflow.log_metrics(loggable_metrics)

            orchestrator.complete_run(
                mongo_run_id, experiment_id, flat_metrics, artifacts
            )

            duration = time.monotonic() - pipeline_start
            mlflow.log_metric("pipeline_duration_seconds", duration)
            mlflow.set_tag("pipeline_status", "completed")
            TRAINING_RUN_DURATION.labels(tier=str(tier), status="completed").observe(duration)
            TRAINING_RUN_TOTAL.labels(tier=str(tier), status="completed").inc()

            logger.info("=== Pipeline complete (%.1fs) ===", duration)

        except Exception:
            tb = traceback.format_exc()
            logger.error("Pipeline failed:\n%s", tb)
            orchestrator.fail_run(mongo_run_id, experiment_id, tb[-500:])
            mlflow.set_tag("pipeline_status", "failed")
            mlflow.set_tag("error", tb[-250:])
            duration = time.monotonic() - pipeline_start
            TRAINING_RUN_DURATION.labels(tier=str(tier), status="failed").observe(duration)
            TRAINING_RUN_TOTAL.labels(tier=str(tier), status="failed").inc()
            raise


def _train_tier(
    tier: int,
    loader,
    config: dict,
    instrument_key: str,
    start_date: str,
    end_date: str,
) -> dict:
    """Dispatch to the correct tier training function."""
    if tier == 0:
        from .pipelines.train_tier0.nodes import train_xgboost_gap_model
        return train_xgboost_gap_model(loader, config, instrument_key, start_date, end_date)

    elif tier == 1:
        from .pipelines.train_tier1.nodes_hmm import train_regime_hmm_model
        from .pipelines.train_tier1.nodes_patchtst import train_patchtst_model
        hmm_result = train_regime_hmm_model(loader, config, instrument_key, start_date, end_date)
        tst_result = train_patchtst_model(loader, config, instrument_key, start_date, end_date)
        merged_metrics = {**hmm_result.get("metrics", {}), **tst_result.get("metrics", {})}
        merged_oof = hmm_result.get("oof")
        if tst_result.get("oof") is not None and merged_oof is not None:
            import pandas as pd
            merged_oof = pd.merge(merged_oof, tst_result["oof"], on="timestamp", how="outer")
        merged_artifacts = {**hmm_result.get("artifacts", {}), **tst_result.get("artifacts", {})}
        return {"metrics": merged_metrics, "oof": merged_oof, "artifacts": merged_artifacts}

    elif tier == 2:
        from .pipelines.train_tier2.nodes_cpcv import train_lightgbm_cpcv
        return train_lightgbm_cpcv(loader, config, instrument_key, start_date, end_date)

    elif tier == 3:
        from .pipelines.train_tier3.nodes_lit import train_lit_model
        return train_lit_model(loader, config, instrument_key, start_date, end_date)

    elif tier == 4:
        return {}

    else:
        raise ValueError(f"Unknown tier: {tier}")


def _train_meta(all_oof: dict, config: dict) -> dict:
    from .pipelines.train_meta.nodes_metalearner import train_meta_learner
    return train_meta_learner(all_oof, config)


def main() -> None:
    parser = argparse.ArgumentParser(description="Institutional Training Pipeline Runner")
    parser.add_argument("--experiment-id", required=True, help="MongoDB experiment ObjectId")
    parser.add_argument("--tier", type=str, default=None, help="Override tier (0-4 or 'full')")
    parser.add_argument("--dry-run", action="store_true", help="Print config without training")
    parser.add_argument("--log-level", default="INFO", help="Logging level")
    args = parser.parse_args()

    setup_structured_logging(args.log_level)
    init_otel()
    start_metrics_server()

    tier_val = args.tier
    if tier_val and tier_val.isdigit():
        tier_val = int(tier_val)

    run_pipeline(
        experiment_id=args.experiment_id,
        tier_override=tier_val,
        dry_run=args.dry_run,
    )


if __name__ == "__main__":
    main()
