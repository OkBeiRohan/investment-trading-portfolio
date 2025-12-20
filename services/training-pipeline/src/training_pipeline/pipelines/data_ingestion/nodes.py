# src/training_pipeline/pipelines/data_ingestion/nodes.py
import pandas as pd
from typing import Dict, Any


def fetch_market_data(parameters: Dict[str, Any]) -> pd.DataFrame:
    """
    Fetch raw tick data from TimescaleDB
    """
    # This is handled by Kedro's SQLQueryDataset in catalog.yml
    # The node simply returns the data
    pass  # Kedro auto-handles this


def create_labels(df: pd.DataFrame, forecast_horizon: int) -> pd.DataFrame:
    """
    Create target labels (VOL_UP/VOL_DOWN)
    based on future ATM IV change
    """
    # Calculate future IV change
    df["future_iv"] = df.groupby("instrument_key")["iv"].shift(-forecast_horizon)
    df["iv_change"] = (df["future_iv"] - df["iv"]) / df["iv"]

    # Binary classification
    df["label"] = (df["iv_change"] > 0).astype(int)

    # Remove NaN rows (at the end)
    df = df.dropna(subset=["label"])

    return df


def split_train_test(
    df: pd.DataFrame, train_split: float, val_split: float
) -> Dict[str, pd.DataFrame]:
    """
    Split data into train/val/test with temporal ordering
    """
    # Sort by time (critical for time-series)
    df = df.sort_values("time")

    n = len(df)
    train_end = int(n * train_split)
    val_end = int(n * (train_split + val_split))

    return {"train": df[:train_end], "val": df[train_end:val_end], "test": df[val_end:]}
