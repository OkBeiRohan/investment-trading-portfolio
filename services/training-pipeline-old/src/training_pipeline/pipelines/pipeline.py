"""
Training Pipeline Registry

Registers all Kedro pipelines for the training system.

ARCHITECTURE (Updated for compute-engine):
- compute-engine (Rust/NAPI) handles feature computation
- market-feeder stores pre-computed features in QuestDB
- training-pipeline LOADS features (no computation) and trains models
"""

from kedro.pipeline import Pipeline  # type: ignore

from training_pipeline.pipelines.train_ensemble import pipeline as train_ensemble_pipeline  # type: ignore


def register_pipelines() -> dict[str, Pipeline]:  # type: ignore[misc]
    """
    Register all Kedro pipelines

    Returns:
        Dictionary of pipeline names to Pipeline objects
    """
    return {  # type: ignore[misc]
        # Main training pipeline (TIER 1 + TIER 2 models)
        "train_ensemble": train_ensemble_pipeline.create_pipeline(),
        # Default pipeline (runs train_ensemble)
        "__default__": train_ensemble_pipeline.create_pipeline(),
    }
