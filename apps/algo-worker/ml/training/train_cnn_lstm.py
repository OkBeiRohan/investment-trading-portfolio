"""
CNN-LSTM Hybrid Model Training Script

Combines 1D Convolutional layers for local pattern detection
with LSTM layers for temporal dependencies.
"""

import numpy as np
import pandas as pd
import yaml
import json
from pathlib import Path
from typing import Dict, Tuple
import sys

# Add utils to path
sys.path.append(str(Path(__file__).parent.parent / "utils"))

from data_loader import (
    load_training_data,
    split_time_series,
    create_sequences,
    normalize_features,
    balance_classes,
)
from model_export import export_keras_to_onnx, save_model_metadata, test_onnx_inference
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
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint


class CNNLSTMTrainer:
    def __init__(self, config_path: str = "ml/config/cnn_lstm_config.yaml"):
        """Initialize CNN-LSTM trainer"""
        with open(config_path, "r") as f:
            self.config = yaml.safe_load(f)

        # Enable GPU memory growth
        if self.config.get("system", {}).get("gpu_memory_growth", True):
            gpus = tf.config.list_physical_devices("GPU")
            if gpus:
                for gpu in gpus:
                    tf.config.experimental.set_memory_growth(gpu, True)
                print(f"GPU devices available: {len(gpus)}")

        self.model = None
        self.scaler = None
        self.history = None

    def build_model(self) -> models.Sequential:
        """Build CNN-LSTM hybrid model"""
        model_config = self.config["model"]
        seq_len = model_config["sequence_length"]
        n_features = model_config["n_features"]

        model = models.Sequential(name=model_config["name"])

        # Input shape: (sequence_length, n_features)
        model.add(layers.Input(shape=(seq_len, n_features)))

        # CNN layers for local pattern extraction
        cnn_config = model_config["cnn"]
        model.add(
            layers.Conv1D(
                filters=cnn_config["filters"],
                kernel_size=cnn_config["kernel_size"],
                activation=cnn_config["activation"],
                padding=cnn_config["padding"],
            )
        )
        model.add(layers.MaxPooling1D(pool_size=cnn_config["pool_size"]))

        # LSTM layers for temporal dependencies
        lstm_config = model_config["lstm"]
        model.add(
            layers.LSTM(
                units=lstm_config["units"],
                return_sequences=lstm_config["return_sequences"],
                dropout=lstm_config["dropout"],
                recurrent_dropout=lstm_config["recurrent_dropout"],
            )
        )

        # Dense layers
        for dense_config in model_config["dense"]:
            model.add(
                layers.Dense(
                    units=dense_config["units"], activation=dense_config["activation"]
                )
            )
            if "dropout" in dense_config:
                model.add(layers.Dropout(dense_config["dropout"]))

        # Output layer
        output_config = model_config["output"]
        model.add(
            layers.Dense(
                units=output_config["units"], activation=output_config["activation"]
            )
        )

        return model

    def compile_model(self, model: models.Sequential):
        """Compile the model"""
        train_config = self.config["training"]
        optimizer_config = train_config["optimizer"]

        # Create optimizer
        if optimizer_config["type"] == "adam":
            optimizer = keras.optimizers.Adam(
                learning_rate=optimizer_config["learning_rate"],
                beta_1=optimizer_config["beta_1"],
                beta_2=optimizer_config["beta_2"],
                epsilon=optimizer_config["epsilon"],
            )
        else:
            optimizer = optimizer_config["type"]

        # Compile
        model.compile(
            optimizer=optimizer,
            loss=train_config["loss"],
            metrics=train_config["metrics"],
        )

        print("\nModel Architecture:")
        model.summary()

    def prepare_callbacks(self, model_dir: str) -> list:
        """Prepare training callbacks"""
        callbacks_config = self.config["training"]["callbacks"]
        callbacks = []

        # Early stopping
        if "early_stopping" in callbacks_config:
            es_config = callbacks_config["early_stopping"]
            callbacks.append(
                EarlyStopping(
                    monitor=es_config["monitor"],
                    patience=es_config["patience"],
                    restore_best_weights=es_config["restore_best_weights"],
                    min_delta=es_config.get("min_delta", 0.0001),
                    verbose=1,
                )
            )

        # Reduce learning rate on plateau
        if "reduce_lr" in callbacks_config:
            lr_config = callbacks_config["reduce_lr"]
            callbacks.append(
                ReduceLROnPlateau(
                    monitor=lr_config["monitor"],
                    factor=lr_config["factor"],
                    patience=lr_config["patience"],
                    min_lr=lr_config["min_lr"],
                    verbose=lr_config["verbose"],
                )
            )

        # Model checkpoint
        if "model_checkpoint" in callbacks_config:
            ckpt_config = callbacks_config["model_checkpoint"]
            checkpoint_path = Path(model_dir) / "best_model.keras"
            callbacks.append(
                ModelCheckpoint(
                    filepath=str(checkpoint_path),
                    monitor=ckpt_config["monitor"],
                    save_best_only=ckpt_config["save_best_only"],
                    mode=ckpt_config["mode"],
                    verbose=1,
                )
            )

        return callbacks

    def train(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: np.ndarray,
        y_val: np.ndarray,
    ) -> Dict:
        """Train the model"""
        train_config = self.config["training"]

        # Build and compile model
        self.model = self.build_model()
        self.compile_model(self.model)

        # Prepare callbacks
        model_dir = "models/cnn_lstm"
        Path(model_dir).mkdir(parents=True, exist_ok=True)
        callbacks = self.prepare_callbacks(model_dir)

        # Train
        print("\nTraining CNN-LSTM model...")
        self.history = self.model.fit(
            X_train,
            y_train,
            validation_data=(X_val, y_val),
            batch_size=train_config["batch_size"],
            epochs=train_config["epochs"],
            callbacks=callbacks,
            shuffle=train_config["shuffle"],
            verbose=1,
        )

        # Load best model if checkpoint was used
        best_model_path = Path(model_dir) / "best_model.keras"
        if best_model_path.exists():
            self.model = keras.models.load_model(str(best_model_path))
            print(f"Loaded best model from {best_model_path}")

        return self.history.history

    def evaluate(
        self,
        X_test: np.ndarray,
        y_test: np.ndarray,
        output_dir: str = "models/cnn_lstm",
    ) -> Dict[str, float]:
        """Evaluate the model"""
        # Predict
        y_pred_proba = self.model.predict(X_test).flatten()

        # Calculate metrics
        threshold = self.config.get("threshold", 0.55)
        metrics = calculate_metrics(y_test, y_pred_proba, threshold)

        print("\nTest Set Performance:")
        for metric, value in metrics.items():
            print(f"  {metric}: {value:.4f}")

        # Classification report
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
            y_test, y_pred_proba, f"{output_dir}/roc_curve.png", model_name="CNN-LSTM"
        )

        plot_training_history(
            self.history.history,
            f"{output_dir}/training_history.png",
            metrics=["loss", "auc"],
        )

        return metrics

    def save(self, output_dir: str = "models/cnn_lstm"):
        """Save model and metadata"""
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        # Save Keras model
        keras_path = f"{output_dir}/cnn_lstm_model.keras"
        self.model.save(keras_path)
        print(f"Keras model saved to {keras_path}")

        # Export to ONNX
        onnx_path = f"{output_dir}/cnn_lstm_model.onnx"
        input_shape = (
            None,
            self.config["model"]["sequence_length"],
            self.config["model"]["n_features"],
        )

        export_keras_to_onnx(self.model, onnx_path, input_shape)

        # Save metadata
        metadata = {
            "model_type": "CNN-LSTM",
            "config": self.config,
            "input_shape": input_shape,
            "threshold": self.config.get("threshold", 0.55),
            "normalization": self.config["data"]["normalization_method"],
        }

        save_model_metadata(f"{output_dir}/metadata.json", metadata)

        # Test ONNX inference
        X_test_sample = np.random.randn(
            1,
            self.config["model"]["sequence_length"],
            self.config["model"]["n_features"],
        ).astype(np.float32)
        test_onnx_inference(onnx_path, X_test_sample)

        print(f"All model files saved to {output_dir}")


def main():
    """Main training pipeline"""
    print("=" * 60)
    print("CNN-LSTM Hybrid Model Training")
    print("=" * 60)

    # Initialize trainer
    trainer = CNNLSTMTrainer()

    # Load data
    print("\nLoading training data...")
    data = load_training_data("data/exports/features_labeled.csv")

    # Split data
    X_train, X_val, X_test, y_train, y_val, y_test = split_time_series(
        data.drop(columns=["target", "timestamp"], errors="ignore"), data["target"]
    )

    # Create sequences
    print("\nCreating sequences...")
    seq_length = trainer.config["model"]["sequence_length"]

    X_train_seq, y_train_seq = create_sequences(
        X_train.values, y_train.values, seq_length
    )
    X_val_seq, y_val_seq = create_sequences(X_val.values, y_val.values, seq_length)
    X_test_seq, y_test_seq = create_sequences(X_test.values, y_test.values, seq_length)

    # Normalize
    print("\nNormalizing features...")
    data_config = trainer.config["data"]
    X_train_norm, scaler = normalize_features(
        X_train_seq.reshape(-1, X_train_seq.shape[-1]),
        method=data_config["normalization_method"],
    )
    X_train_norm = X_train_norm.reshape(X_train_seq.shape)

    X_val_norm = scaler.transform(X_val_seq.reshape(-1, X_val_seq.shape[-1]))
    X_val_norm = X_val_norm.reshape(X_val_seq.shape)

    X_test_norm = scaler.transform(X_test_seq.reshape(-1, X_test_seq.shape[-1]))
    X_test_norm = X_test_norm.reshape(X_test_seq.shape)

    # Balance classes
    if data_config.get("balance_classes", False):
        print("\nBalancing classes...")
        X_train_norm, y_train_seq = balance_classes(
            X_train_norm.reshape(X_train_norm.shape[0], -1),
            y_train_seq,
            method=data_config["balance_method"],
        )
        X_train_norm = X_train_norm.reshape(-1, seq_length, X_train_seq.shape[-1])

    print(f"\nTrain sequences: {X_train_norm.shape}")
    print(f"Val sequences: {X_val_norm.shape}")
    print(f"Test sequences: {X_test_norm.shape}")

    # Train
    history = trainer.train(X_train_norm, y_train_seq, X_val_norm, y_val_seq)

    # Evaluate
    print("\n" + "=" * 60)
    print("EVALUATION")
    print("=" * 60)
    metrics = trainer.evaluate(X_test_norm, y_test_seq)

    # Save
    trainer.save()

    print("\n" + "=" * 60)
    print("Training completed successfully!")
    print("=" * 60)


if __name__ == "__main__":
    main()
