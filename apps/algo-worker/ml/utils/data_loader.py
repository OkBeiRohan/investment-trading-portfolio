"""
Data loading utilities for ML training
"""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Optional, Tuple
import warnings

warnings.filterwarnings("ignore")


def load_training_data(
    file_path: str, dropna: bool = True, fill_method: Optional[str] = None
) -> pd.DataFrame:
    """
    Load and preprocess training data from CSV

    Args:
        file_path: Path to CSV file
        dropna: Whether to drop NaN values
        fill_method: Method to fill NaN ('ffill', 'bfill', 'mean', None)

    Returns:
        Preprocessed DataFrame
    """
    print(f"Loading data from: {file_path}")

    # Load CSV
    df = pd.read_csv(file_path)
    print(f"Loaded {len(df)} rows, {len(df.columns)} columns")

    # Check for NaN values
    nan_counts = df.isna().sum()
    if nan_counts.sum() > 0:
        print(f"\nNaN values found:")
        print(nan_counts[nan_counts > 0])

        if dropna:
            df = df.dropna()
            print(f"Dropped NaN rows. New shape: {df.shape}")
        elif fill_method:
            if fill_method == "mean":
                df = df.fillna(df.mean())
            else:
                df = df.fillna(method=fill_method)
            print(f"Filled NaN values using: {fill_method}")

    # Check for infinite values
    inf_mask = np.isinf(df.select_dtypes(include=[np.number]).values).any(axis=1)
    if inf_mask.sum() > 0:
        print(f"Removing {inf_mask.sum()} rows with infinite values")
        df = df[~inf_mask]

    # Convert timestamp if exists
    if "timestamp" in df.columns:
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        df = df.sort_values("timestamp")
        print("Sorted by timestamp")

    print(f"\nFinal dataset shape: {df.shape}")
    print(
        f"Date range: {df['timestamp'].min()} to {df['timestamp'].max()}"
        if "timestamp" in df.columns
        else ""
    )

    return df


def split_time_series(
    df: pd.DataFrame,
    train_ratio: float = 0.7,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Split time series data maintaining temporal order

    Args:
        df: DataFrame to split
        train_ratio: Training set ratio
        val_ratio: Validation set ratio
        test_ratio: Test set ratio

    Returns:
        Tuple of (train_df, val_df, test_df)
    """
    assert (
        abs(train_ratio + val_ratio + test_ratio - 1.0) < 1e-6
    ), "Ratios must sum to 1"

    n = len(df)
    train_end = int(n * train_ratio)
    val_end = int(n * (train_ratio + val_ratio))

    train_df = df.iloc[:train_end]
    val_df = df.iloc[train_end:val_end]
    test_df = df.iloc[val_end:]

    print(f"\nData split:")
    print(f"Train: {len(train_df)} rows ({train_ratio*100:.1f}%)")
    print(f"Val:   {len(val_df)} rows ({val_ratio*100:.1f}%)")
    print(f"Test:  {len(test_df)} rows ({test_ratio*100:.1f}%)")

    return train_df, val_df, test_df


def create_sequences(
    df: pd.DataFrame,
    sequence_length: int = 60,
    target_col: str = "label",
    stride: int = 1,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Create sequences for LSTM/CNN-LSTM models

    Args:
        df: DataFrame with features
        sequence_length: Length of each sequence
        target_col: Name of target column
        stride: Step size for sliding window

    Returns:
        Tuple of (X_sequences, y_sequences)
    """
    feature_cols = [col for col in df.columns if col not in [target_col, "timestamp"]]
    X_data = df[feature_cols].values
    y_data = df[target_col].values

    X_sequences = []
    y_sequences = []

    for i in range(0, len(X_data) - sequence_length, stride):
        X_sequences.append(X_data[i : i + sequence_length])
        y_sequences.append(y_data[i + sequence_length - 1])  # Take last label

    X_sequences = np.array(X_sequences)
    y_sequences = np.array(y_sequences)

    print(f"\nCreated sequences:")
    print(f"X shape: {X_sequences.shape} (samples, timesteps, features)")
    print(f"y shape: {y_sequences.shape}")

    return X_sequences, y_sequences


def balance_classes(
    X: np.ndarray, y: np.ndarray, method: str = "undersample"
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Balance classes using undersampling or oversampling

    Args:
        X: Features
        y: Labels
        method: 'undersample' or 'oversample'

    Returns:
        Balanced (X, y)
    """
    unique, counts = np.unique(y, return_counts=True)
    print(f"\nOriginal class distribution: {dict(zip(unique, counts))}")

    if method == "undersample":
        # Undersample majority class
        min_count = counts.min()
        indices = []
        for label in unique:
            label_indices = np.where(y == label)[0]
            sampled_indices = np.random.choice(label_indices, min_count, replace=False)
            indices.extend(sampled_indices)

        indices = np.array(indices)
        np.random.shuffle(indices)

        X_balanced = X[indices]
        y_balanced = y[indices]

    elif method == "oversample":
        # Oversample minority class
        max_count = counts.max()
        X_balanced = []
        y_balanced = []

        for label in unique:
            label_indices = np.where(y == label)[0]
            sampled_indices = np.random.choice(label_indices, max_count, replace=True)
            X_balanced.append(X[sampled_indices])
            y_balanced.append(y[sampled_indices])

        X_balanced = np.vstack(X_balanced)
        y_balanced = np.concatenate(y_balanced)

        # Shuffle
        shuffle_indices = np.random.permutation(len(X_balanced))
        X_balanced = X_balanced[shuffle_indices]
        y_balanced = y_balanced[shuffle_indices]

    else:
        raise ValueError(f"Unknown method: {method}")

    unique_balanced, counts_balanced = np.unique(y_balanced, return_counts=True)
    print(f"Balanced class distribution: {dict(zip(unique_balanced, counts_balanced))}")

    return X_balanced, y_balanced


def normalize_features(
    X_train: np.ndarray,
    X_val: Optional[np.ndarray] = None,
    X_test: Optional[np.ndarray] = None,
    method: str = "standard",
) -> Tuple:
    """
    Normalize features

    Args:
        X_train: Training features
        X_val: Validation features (optional)
        X_test: Test features (optional)
        method: 'standard' or 'minmax'

    Returns:
        Tuple of normalized arrays and scaler
    """
    from sklearn.preprocessing import StandardScaler, MinMaxScaler

    if method == "standard":
        scaler = StandardScaler()
    elif method == "minmax":
        scaler = MinMaxScaler()
    else:
        raise ValueError(f"Unknown normalization method: {method}")

    # Fit on training data only
    X_train_norm = scaler.fit_transform(X_train)

    results = [X_train_norm]

    if X_val is not None:
        X_val_norm = scaler.transform(X_val)
        results.append(X_val_norm)

    if X_test is not None:
        X_test_norm = scaler.transform(X_test)
        results.append(X_test_norm)

    results.append(scaler)

    print(f"\nNormalized features using {method} scaling")
    print(f"Train mean: {X_train_norm.mean():.4f}, std: {X_train_norm.std():.4f}")

    return tuple(results)
