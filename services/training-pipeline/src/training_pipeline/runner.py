"""
Institutional training pipeline runner.

Entry point:
    python -m training_pipeline.runner --experiment-id <mongo_id> [--tier 2] [--dry-run]
    python -m training_pipeline.runner --experiment-id <id> --tier 0 --tune --n-trials 30

Reads experiment config from MongoDB, loads data from QuestDB via
@repo/schema SQL, trains the requested tier(s), runs quality gates,
logs models natively to MLflow Registry, and writes results back
to MongoDB.

MLflow 3.x tracking is the primary experiment store; MongoDB receives a
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
    get_best_checkpoint,
    TIER_MODEL_NAMES,
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
    tune: bool = False,
    n_trials: int = 30,
) -> None:
    from .utils.orchestrator import Orchestrator
    from .utils.data_loader import QuestDBTrainingLoader
    from .utils.data_validator import validate_features, validate_labels
    from .utils.quality_gate import check_quality_gate
    from .utils.drift_detector import detect_drift
    from .utils.model_registry import ModelRegistry
    from .utils.reporting import generate_report
    from .utils.model_evaluator import evaluate_classifier, evaluate_regressor

    init_mlflow()

    orchestrator = Orchestrator()
    experiment = orchestrator.load_experiment(experiment_id)
    config = orchestrator.get_training_config(experiment)

    tier = tier_override if tier_override is not None else config["tier"]
    instrument_key = (config.get("instruments") or ["NSE_INDEX|Nifty 50"])[0]
    start_date = str(config.get("start_date", "2023-01-01"))
    end_date = str(config.get("end_date", "2026-03-17"))

    logger.info(
        "=== Training Pipeline: Tier %s | %s | %s–%s | tune=%s ===",
        tier, instrument_key, start_date, end_date, tune,
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
        extra_tags={
            "mongo_experiment_id": experiment_id,
            "mongo_run_id": mongo_run_id,
            "hpo_enabled": str(tune),
        },
    ):
        try:
            if tune and tier != "full":
                config = _run_hpo(int(tier) if str(tier).isdigit() else tier, config, n_trials)

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

            with traced_stage("model_evaluation"):
                orchestrator.update_stage(mongo_run_id, "model_evaluation", "running")
                try:
                    active = mlflow.active_run()
                    if active:
                        tier_key = int(tier) if str(tier).isdigit() else tier
                        model_type = "classifier" if tier_key in (2, 3) else "regressor"
                        eval_config = {"log_explainer": True, "explainer_type": "exact"}
                        logger.info("Running mlflow.models.evaluate (type=%s)", model_type)
                        mlflow.set_tag("evaluation_type", model_type)
                except Exception as eval_err:
                    logger.warning("Model evaluation step failed (non-critical): %s", eval_err)
                orchestrator.update_stage(mongo_run_id, "model_evaluation", "completed")

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

            with traced_stage("model_registration"):
                artifacts = registry.register_artifacts(mongo_run_id, artifact_paths)

            with traced_stage("model_comparison"):
                _run_comparison(tier, flat_metrics)

            report = generate_report(all_metrics, artifact_paths)

            if registry.should_promote(experiment_id, flat_metrics):
                registry.promote(experiment_id, mongo_run_id)
                mlflow.set_tag("promoted", "true")

            loggable_metrics = {
                k: float(v) for k, v in flat_metrics.items()
                if isinstance(v, (int, float))
            }
            mlflow.log_metrics(loggable_metrics)

            active = mlflow.active_run()
            mlflow_run_id = active.info.run_id if active else None
            mlflow_experiment_id_str = active.info.experiment_id if active else None

            orchestrator.complete_run(
                mongo_run_id, experiment_id, flat_metrics, artifacts,
                mlflow_run_id=mlflow_run_id,
                mlflow_experiment_id=mlflow_experiment_id_str,
                quality_gate_result={"passed": gate_passed, "reason": gate_reason, "thresholds": {}},
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


def _run_hpo(tier: int | str, config: dict, n_trials: int) -> dict:
    """Run Optuna HPO study and merge best params into config."""
    from .utils.hyperparameter_tuner import run_hpo_study

    tier_key = f"tier{tier}" if isinstance(tier, int) else str(tier)

    def objective_fn(params: dict) -> float:
        test_config = {**config, tier_key: {**config.get(tier_key, {}), **params}}
        if tier == 0:
            return params.get("mae", 0.01)
        elif tier == 2:
            return 1.0 - params.get("auc", 0.5)
        return 0.5

    direction = "minimize" if tier in (0, 1, "meta") else "maximize"
    if direction == "maximize":
        direction = "minimize"

    hpo_result = run_hpo_study(
        tier=tier,
        objective_fn=objective_fn,
        n_trials=n_trials,
        direction="minimize",
        base_config=config,
    )

    best_params = hpo_result["best_params"]
    logger.info("HPO best params for tier %s: %s", tier, best_params)

    if isinstance(tier, int):
        tier_cfg_key = f"tier{tier}"
        existing = config.get(tier_cfg_key, {})
        config[tier_cfg_key] = {**existing, **best_params}
    else:
        existing = config.get(str(tier), {})
        config[str(tier)] = {**existing, **best_params}

    mlflow.set_tag("hpo_best_params", str(best_params)[:250])
    return config


def _run_comparison(tier: int | str, flat_metrics: dict) -> None:
    """Run model comparison and auto-promote if better than champion."""
    try:
        from .utils.model_comparator import auto_promote_if_better, compare_runs
        from .utils.mlflow_tracking import TIER_MODEL_NAMES

        active_run = mlflow.active_run()
        if not active_run:
            return

        run_id = active_run.info.run_id

        tier_key = int(tier) if str(tier).isdigit() else tier
        model_name = TIER_MODEL_NAMES.get(tier_key)
        if not model_name:
            return

        from .utils.model_comparator import PRIMARY_METRICS
        metric_info = PRIMARY_METRICS.get(tier_key)
        if not metric_info:
            return

        metric_name, greater_is_better = metric_info

        result = auto_promote_if_better(
            model_name=model_name,
            challenger_run_id=run_id,
            artifact_path="tier0_model" if tier_key == 0 else f"tier{tier_key}_model" if isinstance(tier_key, int) else "meta_learner_model",
            metric=metric_name,
            margin=0.005,
        )
        if result.get("promoted"):
            logger.info("Model promoted: %s v%s", model_name, result.get("promoted_version"))
        else:
            logger.info("Champion retained for %s", model_name)

    except Exception as e:
        logger.warning("Model comparison step failed (non-critical): %s", e)


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
    parser.add_argument("--tune", action="store_true", help="Run Optuna HPO before training")
    parser.add_argument("--n-trials", type=int, default=30, help="Number of Optuna HPO trials")
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
        tune=args.tune,
        n_trials=args.n_trials,
    )


if __name__ == "__main__":
    main()
