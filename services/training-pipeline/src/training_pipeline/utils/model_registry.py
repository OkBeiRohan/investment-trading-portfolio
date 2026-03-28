"""
Model registry — artifact management and promotion via MongoDB.

Records artifact metadata (checksums, sizes) in the MongoDB
``training_runs`` document, compares against the previous best run,
and auto-promotes the new model if quality gates pass. Model serving
is handled by MLflow Model Serving (@champion alias).
"""

import hashlib
import logging
import os
from typing import Optional

from bson import ObjectId
from pymongo.database import Database

logger = logging.getLogger(__name__)


def _sha256(filepath: str) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def _file_size(filepath: str) -> int:
    return os.path.getsize(filepath)


class ModelRegistry:
    """Manages model artifacts and promotion in MongoDB."""

    def __init__(self, db: Database):
        self.experiments = db["experiments"]
        self.training_runs = db["training_runs"]

    def register_artifacts(
        self,
        run_id: str,
        artifact_paths: dict[str, str],
    ) -> list[dict]:
        """
        Compute checksums and sizes for model files and store them
        in ``training_runs.artifacts[]``.
        """
        artifacts = []
        for name, path in artifact_paths.items():
            if not os.path.exists(path):
                logger.warning("Artifact not found, skipping: %s -> %s", name, path)
                continue
            rec = {
                "name": name,
                "path": path,
                "type": "mlflow_model",
                "sizeBytes": _file_size(path),
                "checksum": _sha256(path),
            }
            artifacts.append(rec)
            logger.info("Registered artifact %s (%d bytes)", name, rec["sizeBytes"])

        self.training_runs.update_one(
            {"_id": ObjectId(run_id)},
            {"$set": {"artifacts": artifacts}},
        )
        return artifacts

    def should_promote(
        self,
        experiment_id: str,
        new_metrics: dict,
        primary_metric: str = "auc",
    ) -> bool:
        """
        Compare *new_metrics* against the current best run for the experiment.
        Returns True if the new run is better or if there is no previous best.
        """
        exp = self.experiments.find_one({"_id": ObjectId(experiment_id)})
        if exp is None:
            return True
        old = exp.get("metrics", {})
        old_val = old.get(primary_metric)
        new_val = new_metrics.get(primary_metric)
        if old_val is None or new_val is None:
            return True
        better = new_val > old_val
        logger.info(
            "Promotion check: %s old=%.4f new=%.4f -> %s",
            primary_metric, old_val, new_val, "PROMOTE" if better else "KEEP_OLD",
        )
        return better

    def promote(
        self,
        experiment_id: str,
        run_id: str,
        model_path: Optional[str] = None,
    ) -> None:
        """Update experiment to point at the new best run and mark deployed."""
        from datetime import datetime, timezone

        now = datetime.now(timezone.utc)
        update: dict = {
            "bestRunId": ObjectId(run_id),
            "isDeployed": True,
            "deployedAt": now,
            "updatedAt": now,
            "modelFormat": "mlflow_native",
        }
        if model_path:
            update["modelPath"] = model_path

        self.experiments.update_one(
            {"_id": ObjectId(experiment_id)},
            {"$set": update},
        )
        logger.info("Promoted run %s as best for experiment %s", run_id, experiment_id)
