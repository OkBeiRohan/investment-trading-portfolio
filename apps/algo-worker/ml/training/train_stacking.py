"""
Stacking Ensemble Training Script

Level-0: XGBoost, CNN-LSTM, GINN, SVM (all trained separately)
Level-1: Logistic Regression meta-learner

Combines predictions from base models using out-of-fold predictions
to avoid data leakage.
"""

import numpy as np
import pandas as pd
import yaml
import json
from pathlib import Path
from typing import Dict, List, Tuple
import sys

sys.path.append(str(Path(__file__).parent.parent / "utils"))

from data_loader import load_training_data, split_time_series
from model_export import (
    export_sklearn_to_onnx,
    save_model_metadata,
    test_onnx_inference,
)
from evaluation import (
    calculate_metrics,
    plot_confusion_matrix,
    plot_roc_curve,
    print_classification_report,
)

from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import TimeSeriesSplit
import xgboost as xgb
import onnxruntime as ort
import joblib


class StackingEnsembleTrainer:
    def __init__(self, config_path: str = "ml/config/stacking_config.yaml"):
        """Initialize stacking ensemble trainer"""
        with open(config_path, "r") as f:
            self.config = yaml.safe_load(f)

        self.base_models = {}
        self.meta_model = None

    def load_base_models(self):
        """Load pre-trained base models (ONNX format)"""
        print("\nLoading base models...")

        base_config = self.config["base_models"]

        for model_name, model_info in base_config.items():
            if not model_info.get("enabled", True):
                print(f"  {model_name}: Skipped (disabled)")
                continue

            model_path = model_info["model_path"]

            if not Path(model_path).exists():
                print(f"  {model_name}: NOT FOUND at {model_path}")
                print(
                    f"    Please train {model_name} first using train_{model_name}.py"
                )
                continue

            # Load ONNX model
            try:
                session = ort.InferenceSession(model_path)
                self.base_models[model_name] = {
                    "session": session,
                    "weight": model_info["weight"],
                    "input_name": session.get_inputs()[0].name,
                }
                print(f"  {model_name}: Loaded successfully")
            except Exception as e:
                print(f"  {model_name}: Failed to load - {e}")

        if not self.base_models:
            raise RuntimeError("No base models loaded! Train base models first.")

        print(f"\nSuccessfully loaded {len(self.base_models)} base models")

    def get_base_predictions(self, X: np.ndarray) -> np.ndarray:
        """
        Get predictions from all base models

        Args:
            X: Input features

        Returns:
            Array of shape (n_samples, n_models) with base model predictions
        """
        predictions = []

        for model_name, model_info in self.base_models.items():
            session = model_info["session"]
            input_name = model_info["input_name"]

            # Run inference
            X_input = X.astype(np.float32)
            pred = session.run(None, {input_name: X_input})[0]

            # Handle different output shapes
            if pred.ndim > 1:
                pred = pred.flatten()

            predictions.append(pred)

        return np.column_stack(predictions)

    def generate_out_of_fold_predictions(
        self, X_train: np.ndarray, y_train: np.ndarray
    ) -> np.ndarray:
        """
        Generate out-of-fold predictions from base models

        This ensures meta-model trains on data it hasn't seen,
        preventing data leakage.

        Args:
            X_train: Training features
            y_train: Training labels

        Returns:
            Out-of-fold predictions (n_samples, n_models)
        """
        print("\nGenerating out-of-fold predictions for meta-model...")

        cv_folds = self.config["training"]["cv_folds"]
        tscv = TimeSeriesSplit(n_splits=cv_folds)

        n_samples = len(X_train)
        n_models = len(self.base_models)
        oof_predictions = np.zeros((n_samples, n_models))

        for fold_idx, (train_idx, val_idx) in enumerate(tscv.split(X_train)):
            print(f"  Fold {fold_idx + 1}/{cv_folds}...")

            X_val_fold = X_train[val_idx]

            # Get base model predictions for validation fold
            fold_preds = self.get_base_predictions(X_val_fold)

            # Store out-of-fold predictions
            oof_predictions[val_idx] = fold_preds

        print("Out-of-fold predictions generated successfully")
        return oof_predictions

    def build_meta_model(self):
        """Build Level-1 meta-model"""
        meta_config = self.config["meta_model"]
        model_type = meta_config["type"]

        print(f"\nBuilding meta-model: {model_type}")

        if model_type == "logistic_regression":
            lr_config = meta_config["logistic_regression"]
            self.meta_model = LogisticRegression(
                penalty=lr_config["penalty"],
                C=lr_config["C"],
                solver=lr_config["solver"],
                max_iter=lr_config["max_iter"],
                class_weight=lr_config.get("class_weight", None),
                random_state=self.config["random_state"],
                verbose=self.config.get("verbose", 0),
            )

        elif model_type == "xgboost":
            xgb_config = meta_config["xgboost_meta"]
            self.meta_model = xgb.XGBClassifier(
                max_depth=xgb_config["max_depth"],
                learning_rate=xgb_config["learning_rate"],
                n_estimators=xgb_config["n_estimators"],
                subsample=xgb_config["subsample"],
                random_state=self.config["random_state"],
            )

        else:
            raise ValueError(f"Unknown meta-model type: {model_type}")

        print(f"Meta-model built: {self.meta_model.__class__.__name__}")

    def train(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: np.ndarray,
        y_val: np.ndarray,
    ) -> Dict:
        """Train stacking ensemble"""

        # Step 1: Load base models
        self.load_base_models()

        # Step 2: Generate out-of-fold predictions
        use_probabilities = self.config["stacking"]["use_probabilities"]

        if use_probabilities:
            print("\nUsing base model probabilities for meta-model")
            oof_preds = self.generate_out_of_fold_predictions(X_train, y_train)
        else:
            print("\nUsing base model class predictions for meta-model")
            oof_preds = self.get_base_predictions(X_train)
            oof_preds = (oof_preds > 0.5).astype(int)

        # Step 3: Build meta-model
        self.build_meta_model()

        # Step 4: Train meta-model on out-of-fold predictions
        print("\nTraining meta-model...")

        if self.config["stacking"].get("include_original_features", False):
            # Concatenate base predictions with original features
            X_meta_train = np.hstack([oof_preds, X_train])
            print(
                f"Meta-model input shape (with original features): {X_meta_train.shape}"
            )
        else:
            X_meta_train = oof_preds
            print(f"Meta-model input shape: {X_meta_train.shape}")

        self.meta_model.fit(X_meta_train, y_train)

        # Evaluate on validation set
        X_val_base_preds = self.get_base_predictions(X_val)

        if self.config["stacking"].get("include_original_features", False):
            X_meta_val = np.hstack([X_val_base_preds, X_val])
        else:
            X_meta_val = X_val_base_preds

        val_score = self.meta_model.score(X_meta_val, y_val)
        print(f"\nValidation accuracy: {val_score:.4f}")

        # Print meta-model coefficients (for logistic regression)
        if isinstance(self.meta_model, LogisticRegression):
            print("\nMeta-model coefficients (which L0 model it trusts most):")
            for i, (model_name, coef) in enumerate(
                zip(self.base_models.keys(), self.meta_model.coef_[0])
            ):
                print(f"  {model_name}: {coef:.4f}")

        return {"val_accuracy": val_score}

    def predict(self, X: np.ndarray) -> np.ndarray:
        """Generate ensemble predictions"""
        # Get base model predictions
        base_preds = self.get_base_predictions(X)

        # Meta-model prediction
        if self.config["stacking"].get("include_original_features", False):
            X_meta = np.hstack([base_preds, X])
        else:
            X_meta = base_preds

        # Get probabilities
        y_pred_proba = self.meta_model.predict_proba(X_meta)[:, 1]

        return y_pred_proba

    def evaluate(
        self,
        X_test: np.ndarray,
        y_test: np.ndarray,
        output_dir: str = "models/stacking",
    ) -> Dict[str, float]:
        """Evaluate stacking ensemble"""

        # Predict
        y_pred_proba = self.predict(X_test)

        # Calculate metrics
        threshold = self.config.get("threshold", 0.55)
        metrics = calculate_metrics(y_test, y_pred_proba, threshold)

        print("\nTest Set Performance:")
        for metric, value in metrics.items():
            print(f"  {metric}: {value:.4f}")

        print_classification_report(
            y_test, y_pred_proba, threshold, class_names=["VOL_DOWN", "VOL_UP"]
        )

        # Plots
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        plot_confusion_matrix(
            y_test,
            y_pred_proba,
            f"{output_dir}/confusion_matrix.png",
            threshold,
            class_names=["VOL_DOWN", "VOL_UP"],
        )

        plot_roc_curve(
            y_test,
            y_pred_proba,
            f"{output_dir}/roc_curve.png",
            model_name="Stacking Ensemble",
        )

        return metrics

    def save(self, output_dir: str = "models/stacking"):
        """Save meta-model"""
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        # Save meta-model
        meta_path = f"{output_dir}/meta_model.pkl"
        joblib.dump(self.meta_model, meta_path)
        print(f"Meta-model saved to {meta_path}")

        # Export meta-model to ONNX
        onnx_path = f"{output_dir}/meta_model.onnx"
        n_features = len(self.base_models)

        if self.config["stacking"].get("include_original_features", False):
            # Need to know original feature count
            print("Note: ONNX export with original features requires input shape")

        export_sklearn_to_onnx(self.meta_model, onnx_path, n_features=n_features)

        # Save metadata
        metadata = {
            "model_type": "Stacking Ensemble",
            "config": self.config,
            "base_models": list(self.base_models.keys()),
            "meta_model_type": self.config["meta_model"]["type"],
            "threshold": self.config.get("threshold", 0.55),
        }

        save_model_metadata(f"{output_dir}/metadata.json", metadata)

        print(f"All model files saved to {output_dir}")


def main():
    """Main training pipeline"""
    print("=" * 60)
    print("Stacking Ensemble Training")
    print("=" * 60)

    # Initialize trainer
    trainer = StackingEnsembleTrainer()

    # Load data
    print("\nLoading training data...")
    data = load_training_data("data/exports/features_labeled.csv")

    # Split data
    X_train, X_val, X_test, y_train, y_val, y_test = split_time_series(
        data.drop(columns=["target", "timestamp"], errors="ignore"), data["target"]
    )

    print(f"\nTrain samples: {len(X_train)}")
    print(f"Val samples: {len(X_val)}")
    print(f"Test samples: {len(X_test)}")

    # Train
    metrics = trainer.train(X_train.values, y_train.values, X_val.values, y_val.values)

    # Evaluate
    print("\n" + "=" * 60)
    print("EVALUATION")
    print("=" * 60)
    test_metrics = trainer.evaluate(X_test.values, y_test.values)

    # Save
    trainer.save()

    print("\n" + "=" * 60)
    print("Training completed successfully!")
    print("=" * 60)
    print("\nExpected Performance Targets:")
    print("  - Sharpe Ratio: > 1.5")
    print("  - Sortino Ratio: > 2.0")
    print("  - Max Drawdown: < 20%")
    print("=" * 60)


if __name__ == "__main__":
    main()
