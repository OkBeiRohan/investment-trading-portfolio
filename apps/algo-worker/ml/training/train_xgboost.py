"""
XGBoost Model Training Script
Trains XGBoost classifier for volatility prediction
"""

import os
import sys
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
)
import joblib
import yaml
from pathlib import Path
from typing import Tuple, Dict
import json

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from utils.data_loader import load_training_data
from utils.model_export_simple import export_to_onnx, save_model_metadata
from utils.evaluation import calculate_metrics, plot_feature_importance


class XGBoostTrainer:
    """XGBoost model trainer for volatility prediction"""

    def __init__(self, config_path: str = None):
        """Initialize trainer with configuration"""
        if config_path is None:
            # Use absolute path from script location
            script_dir = Path(__file__).parent.parent
            config_path = script_dir / "config" / "xgboost_config.yaml"

        with open(config_path, "r") as f:
            self.config = yaml.safe_load(f)

        self.model = None
        self.feature_columns = None
        self.best_params = None

    def prepare_data(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """
        Prepare features and labels

        Args:
            df: DataFrame with features and label column

        Returns:
            Tuple of (X, y) arrays
        """
        # Separate features and label
        self.feature_columns = [col for col in df.columns if col != "label"]
        X = df[self.feature_columns].values
        y = df["label"].values

        print(f"Features shape: {X.shape}")
        print(f"Labels shape: {y.shape}")
        print(f"Class distribution: {np.bincount(y.astype(int))}")

        return X, y

    def train(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: np.ndarray,
        y_val: np.ndarray,
    ) -> Dict:
        """
        Train XGBoost model

        Args:
            X_train: Training features
            y_train: Training labels
            X_val: Validation features
            y_val: Validation labels

        Returns:
            Training metrics
        """
        # XGBoost parameters from config
        params = self.config["model"]["params"]

        # Create DMatrix for XGBoost
        dtrain = xgb.DMatrix(X_train, label=y_train)
        dval = xgb.DMatrix(X_val, label=y_val)

        # Training parameters
        train_params = {
            **params,
            "objective": "binary:logistic",
            "eval_metric": ["logloss", "auc"],
        }

        # Train with early stopping
        evals = [(dtrain, "train"), (dval, "val")]
        self.model = xgb.train(
            train_params,
            dtrain,
            num_boost_round=self.config["training"]["num_boost_round"],
            evals=evals,
            early_stopping_rounds=self.config["training"]["early_stopping_rounds"],
            verbose_eval=50,
        )

        # Get predictions
        y_train_pred = self.model.predict(dtrain)
        y_val_pred = self.model.predict(dval)

        # Calculate metrics
        train_metrics = calculate_metrics(y_train, y_train_pred)
        val_metrics = calculate_metrics(y_val, y_val_pred)

        print("\n=== Training Metrics ===")
        for metric, value in train_metrics.items():
            print(f"{metric}: {value:.4f}")

        print("\n=== Validation Metrics ===")
        for metric, value in val_metrics.items():
            print(f"{metric}: {value:.4f}")

        return {
            "train": train_metrics,
            "val": val_metrics,
            "best_iteration": self.model.best_iteration,
        }

    def save_model(self, output_dir: str = None):
        """Save trained model and metadata"""
        if output_dir is None:
            script_dir = Path(__file__).parent.parent.parent
            output_dir = script_dir / "models"
        
        os.makedirs(output_dir, exist_ok=True)

        # Save XGBoost native format
        model_path = os.path.join(output_dir, "xgboost.json")
        self.model.save_model(model_path)
        print(f"Saved XGBoost model to {model_path}")

        # Save feature names
        feature_path = os.path.join(output_dir, "xgboost_features.json")
        with open(feature_path, "w") as f:
            json.dump(
                {
                    "features": self.feature_columns,
                    "num_features": len(self.feature_columns),
                },
                f,
                indent=2,
            )
        print(f"Saved feature metadata to {feature_path}")

        # Save model (joblib format as workaround for ONNX compatibility issues)
        model_path = os.path.join(output_dir, "xgboost.pkl")
        export_to_onnx(self.model, model_path, self.feature_columns)

        # Save metadata
        metadata_path = os.path.join(output_dir, "metadata.json")
        save_model_metadata(
            metadata_path,
            {
                "model_type": "xgboost",
                "n_features": len(self.feature_columns),
                "features": self.feature_columns,
                "threshold": self.config["threshold"],
            },
        )

        # Plot and save feature importance
        importance_plot_path = os.path.join(output_dir, "xgboost_importance.png")
        plot_feature_importance(
            self.model, self.feature_columns, importance_plot_path, top_n=20
        )

    def cross_validate(self, X: np.ndarray, y: np.ndarray, n_splits: int = 5) -> Dict:
        """
        Perform time-series cross-validation

        Args:
            X: Features
            y: Labels
            n_splits: Number of CV splits

        Returns:
            Cross-validation metrics
        """
        tscv = TimeSeriesSplit(n_splits=n_splits)
        cv_scores = []

        print(f"\n=== {n_splits}-Fold Time Series Cross-Validation ===")

        for fold, (train_idx, val_idx) in enumerate(tscv.split(X), 1):
            print(f"\nFold {fold}/{n_splits}")

            X_train, X_val = X[train_idx], X[val_idx]
            y_train, y_val = y[train_idx], y[val_idx]

            # Train on fold
            metrics = self.train(X_train, y_train, X_val, y_val)
            cv_scores.append(metrics["val"])

        # Average metrics across folds
        avg_metrics = {}
        for metric in cv_scores[0].keys():
            values = [fold[metric] for fold in cv_scores]
            avg_metrics[metric] = {"mean": np.mean(values), "std": np.std(values)}

        print("\n=== Cross-Validation Results ===")
        for metric, stats in avg_metrics.items():
            print(f"{metric}: {stats['mean']:.4f} (+/- {stats['std']:.4f})")

        return avg_metrics


def main():
    """Main training pipeline"""
    print("=" * 80)
    print("XGBoost Training Pipeline")
    print("=" * 80)

    # Initialize trainer
    trainer = XGBoostTrainer()

    # Load data
    print("\n1. Loading training data...")
    script_dir = Path(__file__).parent.parent.parent  # Go to algo-worker root
    data_path = script_dir / "data" / "exports" / "features_labeled.csv"
    df = load_training_data(str(data_path))

    # Prepare data
    print("\n2. Preparing features...")
    X, y = trainer.prepare_data(df)

    # Split data (80/20 train/val)
    split_idx = int(len(X) * 0.8)
    X_train, X_val = X[:split_idx], X[split_idx:]
    y_train, y_val = y[:split_idx], y[split_idx:]

    # Train model
    print("\n3. Training XGBoost model...")
    metrics = trainer.train(X_train, y_train, X_val, y_val)

    # Save model
    print("\n4. Saving model...")
    trainer.save_model()

    # Optional: Cross-validation
    if input("\nRun cross-validation? (y/n): ").lower() == "y":
        print("\n5. Running cross-validation...")
        cv_metrics = trainer.cross_validate(X, y, n_splits=5)

    print("\n" + "=" * 80)
    print("Training completed successfully!")
    print("=" * 80)


if __name__ == "__main__":
    main()
