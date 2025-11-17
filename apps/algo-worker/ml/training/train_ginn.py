"""
GARCH-Informed Neural Network (GINN) Training Script

Two-stage hybrid approach:
1. Fit GARCH(1,1) to volatility time series
2. Train LSTM on GARCH residuals (non-linear patterns)
3. Combine: Final forecast = GARCH + LSTM(residuals)
"""

import numpy as np
import pandas as pd
import yaml
import json
from pathlib import Path
from typing import Dict, Tuple
import sys

sys.path.append(str(Path(__file__).parent.parent / "utils"))

from data_loader import (
    load_training_data,
    split_time_series,
    create_sequences,
    normalize_features,
)
from model_export import export_keras_to_onnx, save_model_metadata
from evaluation import (
    calculate_metrics,
    plot_confusion_matrix,
    plot_roc_curve,
    plot_training_history,
    print_classification_report,
)

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, models
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau

from arch import arch_model
import joblib


class GINNTrainer:
    def __init__(self, config_path: str = "ml/config/ginn_config.yaml"):
        """Initialize GINN trainer"""
        with open(config_path, "r") as f:
            self.config = yaml.safe_load(f)

        self.garch_model = None
        self.lstm_model = None
        self.scaler = None
        self.history = None

    def fit_garch(self, volatility_series: pd.Series) -> Tuple:
        """
        Fit GARCH(1,1) model to volatility series

        Args:
            volatility_series: Time series of volatility (India VIX or ATM IV)

        Returns:
            (garch_model, garch_predictions, residuals)
        """
        print("\nFitting GARCH(1,1) model...")

        garch_config = self.config["garch"]

        # Create GARCH model
        garch_model = arch_model(
            volatility_series,
            mean=garch_config["mean"],
            vol=garch_config["vol"],
            p=garch_config["p"],
            q=garch_config["q"],
            dist=garch_config["dist"],
            rescale=garch_config["rescale"],
        )

        # Fit model
        result = garch_model.fit(disp="off")
        print("GARCH model fitted successfully")
        print(result.summary())

        # Get predictions and residuals
        garch_predictions = result.conditional_volatility
        residuals = volatility_series - garch_predictions

        self.garch_model = result

        return result, garch_predictions, residuals

    def build_lstm(self, input_shape: Tuple) -> models.Sequential:
        """Build LSTM model for residuals"""
        lstm_config = self.config["lstm"]
        dense_config = self.config["dense"]
        output_config = self.config["output"]

        model = models.Sequential(name="ginn_lstm")
        model.add(layers.Input(shape=input_shape))

        # LSTM layers
        for i in range(lstm_config["layers"]):
            return_sequences = i < lstm_config["layers"] - 1

            if lstm_config.get("bidirectional", False):
                model.add(
                    layers.Bidirectional(
                        layers.LSTM(
                            units=lstm_config["units"],
                            return_sequences=return_sequences,
                            dropout=lstm_config["dropout"],
                            recurrent_dropout=lstm_config["recurrent_dropout"],
                        )
                    )
                )
            else:
                model.add(
                    layers.LSTM(
                        units=lstm_config["units"],
                        return_sequences=return_sequences,
                        dropout=lstm_config["dropout"],
                        recurrent_dropout=lstm_config["recurrent_dropout"],
                    )
                )

        # Dense layers
        for layer in dense_config:
            model.add(
                layers.Dense(units=layer["units"], activation=layer["activation"])
            )
            if "dropout" in layer:
                model.add(layers.Dropout(layer["dropout"]))

        # Output layer
        model.add(
            layers.Dense(
                units=output_config["units"], activation=output_config["activation"]
            )
        )

        return model

    def train(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: np.ndarray,
        y_val: np.ndarray,
        volatility_train: pd.Series,
    ) -> Dict:
        """Train GINN model"""

        # Step 1: Fit GARCH model
        garch_result, garch_preds, residuals = self.fit_garch(volatility_train)

        # Step 2: Create sequences from residuals for LSTM
        seq_length = self.config["lstm"]["sequence_length"]
        residuals_array = residuals.values

        # Align residuals with training data
        min_len = min(len(residuals_array), len(X_train))
        residuals_array = residuals_array[-min_len:]

        # Create sequences
        X_train_seq, y_train_seq = create_sequences(
            residuals_array.reshape(-1, 1), y_train[-min_len:], seq_length
        )
        X_val_seq, y_val_seq = create_sequences(
            residuals.values[-len(X_val) :].reshape(-1, 1), y_val, seq_length
        )

        # Step 3: Build and compile LSTM
        self.lstm_model = self.build_lstm(input_shape=(seq_length, 1))

        train_config = self.config["training"]
        optimizer = keras.optimizers.Adam(
            learning_rate=train_config["optimizer"]["learning_rate"]
        )

        self.lstm_model.compile(
            optimizer=optimizer,
            loss=train_config["loss"],
            metrics=train_config["metrics"],
        )

        print("\nLSTM Architecture:")
        self.lstm_model.summary()

        # Callbacks
        callbacks = [
            EarlyStopping(
                monitor="val_loss",
                patience=train_config["callbacks"]["early_stopping"]["patience"],
                restore_best_weights=True,
                verbose=1,
            ),
            ReduceLROnPlateau(
                monitor="val_loss",
                factor=train_config["callbacks"]["reduce_lr"]["factor"],
                patience=train_config["callbacks"]["reduce_lr"]["patience"],
                min_lr=train_config["callbacks"]["reduce_lr"]["min_lr"],
                verbose=1,
            ),
        ]

        # Step 4: Train LSTM on residuals
        print("\nTraining LSTM on GARCH residuals...")
        self.history = self.lstm_model.fit(
            X_train_seq,
            y_train_seq,
            validation_data=(X_val_seq, y_val_seq),
            batch_size=train_config["batch_size"],
            epochs=train_config["epochs"],
            callbacks=callbacks,
            shuffle=train_config["shuffle"],
            verbose=1,
        )

        return self.history.history

    def predict(self, X: np.ndarray, volatility: pd.Series) -> np.ndarray:
        """
        Generate predictions using GARCH + LSTM

        Args:
            X: Feature matrix
            volatility: Volatility series for GARCH

        Returns:
            Combined predictions
        """
        # GARCH predictions
        garch_preds = self.garch_model.forecast(horizon=len(X)).variance.values[-1]

        # Create residuals for LSTM
        seq_length = self.config["lstm"]["sequence_length"]
        residuals = volatility.values - garch_preds

        X_seq, _ = create_sequences(
            residuals.reshape(-1, 1), np.zeros(len(residuals)), seq_length
        )

        # LSTM predictions on residuals
        lstm_preds = self.lstm_model.predict(X_seq).flatten()

        # Combine predictions
        ensemble_config = self.config["ensemble"]
        if ensemble_config["combination_method"] == "weighted_average":
            combined = (
                ensemble_config["garch_weight"] * garch_preds[: len(lstm_preds)]
                + ensemble_config["lstm_weight"] * lstm_preds
            )
        elif ensemble_config["combination_method"] == "addition":
            combined = garch_preds[: len(lstm_preds)] + lstm_preds
        else:
            combined = lstm_preds

        return combined

    def evaluate(
        self,
        X_test: np.ndarray,
        y_test: np.ndarray,
        volatility_test: pd.Series,
        output_dir: str = "models/ginn",
    ) -> Dict[str, float]:
        """Evaluate GINN model"""

        # Generate predictions
        y_pred_proba = self.predict(X_test, volatility_test)

        # Align lengths
        min_len = min(len(y_pred_proba), len(y_test))
        y_pred_proba = y_pred_proba[-min_len:]
        y_test_aligned = y_test[-min_len:]

        # Calculate metrics
        threshold = self.config.get("threshold", 0.55)
        metrics = calculate_metrics(y_test_aligned, y_pred_proba, threshold)

        print("\nTest Set Performance:")
        for metric, value in metrics.items():
            print(f"  {metric}: {value:.4f}")

        print_classification_report(
            y_test_aligned, y_pred_proba, threshold, class_names=["VOL_DOWN", "VOL_UP"]
        )

        # Plots
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        plot_confusion_matrix(
            y_test_aligned,
            y_pred_proba,
            f"{output_dir}/confusion_matrix.png",
            threshold,
            class_names=["VOL_DOWN", "VOL_UP"],
        )

        plot_roc_curve(
            y_test_aligned,
            y_pred_proba,
            f"{output_dir}/roc_curve.png",
            model_name="GINN",
        )

        plot_training_history(
            self.history.history,
            f"{output_dir}/training_history.png",
            metrics=["loss", "auc"],
        )

        return metrics

    def save(self, output_dir: str = "models/ginn"):
        """Save GINN model"""
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        # Save GARCH model
        garch_path = f"{output_dir}/garch_model.pkl"
        joblib.dump(self.garch_model, garch_path)
        print(f"GARCH model saved to {garch_path}")

        # Save LSTM model
        lstm_keras_path = f"{output_dir}/lstm_model.keras"
        self.lstm_model.save(lstm_keras_path)

        # Export LSTM to ONNX
        lstm_onnx_path = f"{output_dir}/lstm_model.onnx"
        seq_length = self.config["lstm"]["sequence_length"]
        export_keras_to_onnx(self.lstm_model, lstm_onnx_path, (None, seq_length, 1))

        # Save metadata
        metadata = {
            "model_type": "GINN",
            "config": self.config,
            "garch_params": {
                "p": self.config["garch"]["p"],
                "q": self.config["garch"]["q"],
                "dist": self.config["garch"]["dist"],
            },
            "threshold": self.config.get("threshold", 0.55),
        }

        save_model_metadata(f"{output_dir}/metadata.json", metadata)

        print(f"All model files saved to {output_dir}")


def main():
    """Main training pipeline"""
    print("=" * 60)
    print("GARCH-Informed Neural Network (GINN) Training")
    print("=" * 60)

    # Initialize trainer
    trainer = GINNTrainer()

    # Load data
    print("\nLoading training data...")
    data = load_training_data("data/exports/features_labeled.csv")

    # Get volatility series (India VIX or ATM IV)
    target_variable = trainer.config["data"]["target_variable"]
    if target_variable not in data.columns:
        raise ValueError(f"Target variable '{target_variable}' not found in data")

    volatility = data[target_variable]

    # Split data
    X_train, X_val, X_test, y_train, y_val, y_test = split_time_series(
        data.drop(columns=["target", "timestamp", target_variable], errors="ignore"),
        data["target"],
    )

    # Split volatility correspondingly
    n_train = len(X_train)
    n_val = len(X_val)
    volatility_train = volatility.iloc[:n_train]
    volatility_test = volatility.iloc[n_train + n_val :]

    print(f"\nTrain samples: {len(X_train)}")
    print(f"Val samples: {len(X_val)}")
    print(f"Test samples: {len(X_test)}")

    # Train
    history = trainer.train(
        X_train.values, y_train.values, X_val.values, y_val.values, volatility_train
    )

    # Evaluate
    print("\n" + "=" * 60)
    print("EVALUATION")
    print("=" * 60)
    metrics = trainer.evaluate(X_test.values, y_test.values, volatility_test)

    # Save
    trainer.save()

    print("\n" + "=" * 60)
    print("Training completed successfully!")
    print("=" * 60)


if __name__ == "__main__":
    main()
