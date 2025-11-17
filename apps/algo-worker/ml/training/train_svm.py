"""
SVM Training Script

Support Vector Machine with RBF kernel.
Research shows SVMs can produce higher economic gains and Sharpe Ratios
despite lower accuracy due to high-conviction signal identification.
"""

import numpy as np
import pandas as pd
import yaml
import json
from pathlib import Path
from typing import Dict
import sys

sys.path.append(str(Path(__file__).parent.parent / "utils"))

from data_loader import (
    load_training_data,
    split_time_series,
    normalize_features,
    balance_classes,
)
from model_export_simple import save_model_metadata
from evaluation import (
    calculate_metrics,
    plot_confusion_matrix,
    plot_roc_curve,
    print_classification_report,
)

from sklearn.svm import SVC
from sklearn.model_selection import GridSearchCV, TimeSeriesSplit
from sklearn.feature_selection import RFE, SelectKBest, f_classif
import joblib


class SVMTrainer:
    def __init__(self, config_path: str = "ml/config/svm_config.yaml"):
        """Initialize SVM trainer"""
        with open(config_path, "r") as f:
            self.config = yaml.safe_load(f)

        self.model = None
        self.scaler = None
        self.feature_selector = None

    def select_features(
        self, X_train: np.ndarray, y_train: np.ndarray, feature_names: list = None
    ):
        """
        Perform feature selection

        Args:
            X_train: Training features
            y_train: Training labels
            feature_names: List of feature names
        """
        feature_config = self.config.get("feature_selection", {})

        if not feature_config.get("enabled", False):
            print("Feature selection disabled")
            return X_train, feature_names

        method = feature_config["method"]
        n_features = feature_config["n_features"]

        print(f"\nPerforming feature selection using {method}...")
        print(f"Selecting top {n_features} features from {X_train.shape[1]}")

        if method == "rfe":
            # Recursive Feature Elimination
            base_estimator = SVC(
                kernel="linear", random_state=self.config["random_state"]
            )
            self.feature_selector = RFE(
                estimator=base_estimator, n_features_to_select=n_features, step=1
            )
            X_selected = self.feature_selector.fit_transform(X_train, y_train)

            if feature_names:
                selected_features = [
                    f
                    for f, selected in zip(
                        feature_names, self.feature_selector.support_
                    )
                    if selected
                ]
                print(f"Selected features: {selected_features}")

        elif method == "select_k_best":
            # SelectKBest with f_classif
            self.feature_selector = SelectKBest(score_func=f_classif, k=n_features)
            X_selected = self.feature_selector.fit_transform(X_train, y_train)

            if feature_names:
                selected_indices = self.feature_selector.get_support(indices=True)
                selected_features = [feature_names[i] for i in selected_indices]
                print(f"Selected features: {selected_features}")

        else:
            X_selected = X_train

        print(
            f"Feature selection complete: {X_train.shape[1]} -> {X_selected.shape[1]}"
        )
        return X_selected, selected_features if feature_names else None

    def train(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: np.ndarray,
        y_val: np.ndarray,
    ) -> Dict:
        """Train SVM model"""

        model_config = self.config["model"]
        grid_config = self.config.get("grid_search", {})

        if grid_config.get("enabled", False):
            # Grid search with cross-validation
            print("\nPerforming grid search...")

            base_model = SVC(
                probability=model_config["probability"],
                class_weight=model_config["class_weight"],
                shrinking=model_config["shrinking"],
                cache_size=model_config["cache_size"],
                max_iter=model_config["max_iter"],
                random_state=self.config["random_state"],
                verbose=self.config.get("verbose", 0),
            )

            # TimeSeriesSplit for cross-validation
            tscv = TimeSeriesSplit(n_splits=grid_config["cv_folds"])

            grid_search = GridSearchCV(
                estimator=base_model,
                param_grid=grid_config["param_grid"],
                cv=tscv,
                scoring=grid_config["scoring"],
                n_jobs=grid_config["n_jobs"],
                verbose=2,
            )

            grid_search.fit(X_train, y_train)

            print("\nBest parameters found:")
            for param, value in grid_search.best_params_.items():
                print(f"  {param}: {value}")

            print(f"\nBest {grid_config['scoring']}: {grid_search.best_score_:.4f}")

            self.model = grid_search.best_estimator_

        else:
            # Train with fixed parameters
            print("\nTraining SVM with fixed parameters...")

            self.model = SVC(
                kernel=model_config["kernel"],
                C=model_config["C"],
                gamma=model_config["gamma"],
                degree=model_config["degree"],
                class_weight=model_config["class_weight"],
                probability=model_config["probability"],
                shrinking=model_config["shrinking"],
                cache_size=model_config["cache_size"],
                max_iter=model_config["max_iter"],
                random_state=self.config["random_state"],
                verbose=self.config.get("verbose", 0),
            )

            self.model.fit(X_train, y_train)

        # Evaluate on validation set
        val_score = self.model.score(X_val, y_val)
        print(f"\nValidation accuracy: {val_score:.4f}")

        return {"val_accuracy": val_score}

    def evaluate(
        self, X_test: np.ndarray, y_test: np.ndarray, output_dir: str = "models/svm"
    ) -> Dict[str, float]:
        """Evaluate SVM model"""

        # Predict
        y_pred_proba = self.model.predict_proba(X_test)[:, 1]

        # Calculate metrics
        threshold = self.config.get("threshold", 0.55)
        metrics = calculate_metrics(y_test, y_pred_proba, threshold)

        print("\nTest Set Performance:")
        for metric, value in metrics.items():
            print(f"  {metric}: {value:.4f}")

        print_classification_report(
            y_test, y_pred_proba, threshold, class_names=["VOL_DOWN", "VOL_UP"]
        )

        # Note about SVM economic gains
        print("\n" + "=" * 60)
        print("NOTE: SVMs often produce HIGHER economic gains (Sharpe ratio)")
        print("despite lower accuracy due to high-conviction signals.")
        print("Focus on Sharpe ratio, not classification accuracy!")
        print("=" * 60)

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
            y_test, y_pred_proba, f"{output_dir}/roc_curve.png", model_name="SVM"
        )

        return metrics

    def save(self, output_dir: str = "models/svm", feature_names: list = None):
        """Save SVM model"""
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        # Save scikit-learn model using joblib
        sklearn_path = f"{output_dir}/svm_model.pkl"
        joblib.dump(self.model, sklearn_path)
        print(f"✓ SVM model saved to {sklearn_path}")

        # Save feature selector if used
        if self.feature_selector is not None:
            selector_path = f"{output_dir}/feature_selector.pkl"
            joblib.dump(self.feature_selector, selector_path)
            print(f"✓ Feature selector saved to {selector_path}")

        # Save metadata
        n_features = self.model.n_features_in_
        metadata = {
            "model_type": "SVM",
            "config": self.config,
            "n_features": n_features,
            "feature_names": feature_names,
            "kernel": self.model.kernel,
            "C": self.model.C,
            "gamma": self.model.gamma,
            "threshold": self.config.get("threshold", 0.55),
            "note": "SVMs can produce higher economic gains despite lower accuracy",
        }

        save_model_metadata(f"{output_dir}/metadata.json", metadata)

        print(f"✓ All model files saved to {output_dir}")


def main():
    """Main training pipeline"""
    print("=" * 60)
    print("SVM Training")
    print("=" * 60)

    # Initialize trainer
    trainer = SVMTrainer()

    # Load data
    print("\nLoading training data...")
    data = load_training_data("data/exports/features_labeled.csv")

    # Split data (split full dataset first, then separate X and y)
    train_df, val_df, test_df = split_time_series(data)

    # Separate features and target
    X_train = train_df.drop(columns=["target", "timestamp"], errors="ignore")
    X_val = val_df.drop(columns=["target", "timestamp"], errors="ignore")
    X_test = test_df.drop(columns=["target", "timestamp"], errors="ignore")

    y_train = train_df["target"]
    y_val = val_df["target"]
    y_test = test_df["target"]

    feature_names = X_train.columns.tolist()

    # Normalize
    print("\nNormalizing features...")
    data_config = trainer.config["data"]
    X_train_norm, scaler = normalize_features(
        X_train.values, method=data_config["normalization_method"]
    )
    X_val_norm = scaler.transform(X_val.values)
    X_test_norm = scaler.transform(X_test.values)

    trainer.scaler = scaler

    # Balance classes
    if data_config.get("balance_classes", False):
        print("\nBalancing classes...")
        X_train_norm, y_train = balance_classes(
            X_train_norm, y_train.values, method=data_config["balance_method"]
        )

    # Feature selection
    X_train_selected, selected_feature_names = trainer.select_features(
        X_train_norm, y_train, feature_names
    )

    if trainer.feature_selector is not None:
        X_val_norm = trainer.feature_selector.transform(X_val_norm)
        X_test_norm = trainer.feature_selector.transform(X_test_norm)

    print(f"\nTrain samples: {X_train_selected.shape}")
    print(f"Val samples: {X_val_norm.shape}")
    print(f"Test samples: {X_test_norm.shape}")

    # Train
    metrics = trainer.train(X_train_selected, y_train, X_val_norm, y_val.values)

    # Evaluate
    print("\n" + "=" * 60)
    print("EVALUATION")
    print("=" * 60)
    test_metrics = trainer.evaluate(X_test_norm, y_test.values)

    # Save
    trainer.save(feature_names=selected_feature_names or feature_names)

    print("\n" + "=" * 60)
    print("Training completed successfully!")
    print("=" * 60)


if __name__ == "__main__":
    main()
