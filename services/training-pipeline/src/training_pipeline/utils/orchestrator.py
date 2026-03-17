"""
MongoDB-driven training orchestrator.

Reads experiment configurations from the ``experiments`` collection,
creates and tracks ``training_runs`` documents, and provides lifecycle
hooks (update_stage, complete_run, fail_run) that the runner calls.

Collection schemas match the NestJS Mongoose definitions:
  - packages/database/src/mongodb/schemas/training/experiment.schema.ts
  - packages/database/src/mongodb/schemas/training/training-run.schema.ts
"""

import os
import logging
import platform
from datetime import datetime, timezone
from typing import Any, Optional

from bson import ObjectId
from pymongo import MongoClient
from pymongo.database import Database

logger = logging.getLogger(__name__)

MONGO_URI_DEFAULT = "mongodb://localhost:27017"
TRADING_DB = "Trading"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _hardware_info() -> dict:
    import shutil

    gpu_enabled = False
    gpu_name = None
    gpu_memory_mb = None
    try:
        import torch
        if torch.cuda.is_available():
            gpu_enabled = True
            gpu_name = torch.cuda.get_device_name(0)
            gpu_memory_mb = torch.cuda.get_device_properties(0).total_mem // (1024 * 1024)
    except ImportError:
        pass

    return {
        "gpuEnabled": gpu_enabled,
        "gpuName": gpu_name,
        "gpuMemoryMb": gpu_memory_mb,
        "cpuCores": os.cpu_count(),
        "ramGb": round(shutil.disk_usage("/").total / (1024 ** 3), 1),
        "platform": platform.platform(),
    }


class Orchestrator:
    """Bridges MongoDB experiment configs into the Python training pipeline."""

    def __init__(self, mongo_uri: Optional[str] = None):
        uri = mongo_uri or os.environ.get("MONGODB_URI", MONGO_URI_DEFAULT)
        self._client: MongoClient = MongoClient(uri)
        self._db: Database = self._client[TRADING_DB]
        self.experiments = self._db["experiments"]
        self.training_runs = self._db["training_runs"]
        logger.info("Orchestrator connected to MongoDB [%s/%s]", uri, TRADING_DB)

    # ------------------------------------------------------------------
    # Experiment loading
    # ------------------------------------------------------------------

    def load_experiment(self, experiment_id: str) -> dict:
        """Fetch a full experiment document by its ``_id``."""
        doc = self.experiments.find_one({"_id": ObjectId(experiment_id)})
        if doc is None:
            raise ValueError(f"Experiment {experiment_id} not found in MongoDB")
        logger.info(
            "Loaded experiment '%s' — tier=%s model=%s",
            doc.get("name"), doc.get("tier"), doc.get("modelType"),
        )
        return doc

    def get_training_config(self, experiment: dict) -> dict:
        """
        Extract a flat config dict suitable for passing into tier training
        functions.  Merges hyperparameters, dataConfig, and top-level fields.
        """
        data_cfg = experiment.get("dataConfig", {})
        hyper = experiment.get("hyperparameters", {})
        return {
            "tier": experiment.get("tier"),
            "model_type": experiment.get("modelType"),
            "start_date": data_cfg.get("startDate"),
            "end_date": data_cfg.get("endDate"),
            "instruments": data_cfg.get("instruments", []),
            "features": data_cfg.get("features", []),
            "validation_type": data_cfg.get("validationType", "cpcv"),
            "n_folds": data_cfg.get("nFolds", 5),
            "test_size": data_cfg.get("testSize", 0.2),
            **hyper,
        }

    # ------------------------------------------------------------------
    # Training run lifecycle
    # ------------------------------------------------------------------

    def create_run(
        self,
        experiment_id: str,
        pipeline: str,
        parameters: dict,
        triggered_by: str = "training-pipeline",
    ) -> str:
        """Create a new training_runs document and return its ``_id`` string."""
        doc = {
            "experimentId": ObjectId(experiment_id),
            "pipeline": pipeline,
            "status": "running",
            "parameters": parameters,
            "stages": [],
            "artifacts": [],
            "hardware": _hardware_info(),
            "metrics": {},
            "startedAt": _utcnow(),
            "completedAt": None,
            "totalDuration": None,
            "error": None,
            "triggeredBy": triggered_by,
            "createdAt": _utcnow(),
            "updatedAt": _utcnow(),
        }
        result = self.training_runs.insert_one(doc)
        run_id = str(result.inserted_id)
        self.experiments.update_one(
            {"_id": ObjectId(experiment_id)},
            {"$set": {"status": "running", "updatedAt": _utcnow()}},
        )
        logger.info("Created training run %s for experiment %s", run_id, experiment_id)
        return run_id

    def update_stage(
        self,
        run_id: str,
        stage_name: str,
        status: str,
        metrics: Optional[dict] = None,
        logs: Optional[list[str]] = None,
        error: Optional[str] = None,
    ) -> None:
        """Append or update a stage entry in the training run."""
        stage: dict[str, Any] = {
            "name": stage_name,
            "status": status,
            "metrics": metrics or {},
            "logs": logs or [],
            "error": error,
        }
        if status == "running":
            stage["startedAt"] = _utcnow()
        if status in ("completed", "failed"):
            stage["completedAt"] = _utcnow()

        self.training_runs.update_one(
            {"_id": ObjectId(run_id), "stages.name": stage_name},
            {"$set": {"stages.$": stage, "updatedAt": _utcnow()}},
        )
        updated = self.training_runs.find_one(
            {"_id": ObjectId(run_id), "stages.name": stage_name}
        )
        if updated is None:
            self.training_runs.update_one(
                {"_id": ObjectId(run_id)},
                {"$push": {"stages": stage}, "$set": {"updatedAt": _utcnow()}},
            )
        logger.info("Stage '%s' → %s (run %s)", stage_name, status, run_id)

    def complete_run(
        self,
        run_id: str,
        experiment_id: str,
        metrics: dict,
        artifacts: Optional[list[dict]] = None,
    ) -> None:
        """Mark a run as completed and update the parent experiment metrics."""
        now = _utcnow()
        run = self.training_runs.find_one({"_id": ObjectId(run_id)})
        started = run["startedAt"] if run else now
        duration = (now - started).total_seconds()

        self.training_runs.update_one(
            {"_id": ObjectId(run_id)},
            {
                "$set": {
                    "status": "completed",
                    "metrics": metrics,
                    "artifacts": artifacts or [],
                    "completedAt": now,
                    "totalDuration": duration,
                    "updatedAt": now,
                }
            },
        )
        self.experiments.update_one(
            {"_id": ObjectId(experiment_id)},
            {
                "$set": {
                    "status": "completed",
                    "metrics": metrics,
                    "bestRunId": ObjectId(run_id),
                    "updatedAt": now,
                }
            },
        )
        logger.info("Run %s completed in %.1fs", run_id, duration)

    def fail_run(
        self,
        run_id: str,
        experiment_id: str,
        error_msg: str,
    ) -> None:
        """Mark a run (and experiment) as failed."""
        now = _utcnow()
        self.training_runs.update_one(
            {"_id": ObjectId(run_id)},
            {
                "$set": {
                    "status": "failed",
                    "error": error_msg,
                    "completedAt": now,
                    "updatedAt": now,
                }
            },
        )
        self.experiments.update_one(
            {"_id": ObjectId(experiment_id)},
            {"$set": {"status": "failed", "updatedAt": now}},
        )
        logger.error("Run %s FAILED: %s", run_id, error_msg)
