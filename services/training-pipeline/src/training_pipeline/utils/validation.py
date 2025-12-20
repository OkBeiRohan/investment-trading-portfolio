# src/training_pipeline/utils/validation.py
import pandas as pd
from typing import List, Tuple
from datetime import timedelta


def walk_forward_split(
    df: pd.DataFrame,
    window_size: int = 180,  # 6 months training
    step_size: int = 30,  # 1 month testing
    n_splits: int = 12,  # 12 iterations
) -> List[Tuple[pd.DataFrame, pd.DataFrame]]:
    """
    Create walk-forward validation splits

    Example:
    [Train 1: 6 months] → [Test 1: 1 month] →
    [Train 2: 6 months] → [Test 2: 1 month] →
    ...
    """
    splits = []

    df = df.sort_values("time")
    start_date = df["time"].min()

    for i in range(n_splits):
        # Training window
        train_start = start_date + timedelta(days=i * step_size)
        train_end = train_start + timedelta(days=window_size)

        # Testing window
        test_start = train_end
        test_end = test_start + timedelta(days=step_size)

        train_df = df[(df["time"] >= train_start) & (df["time"] < train_end)]
        test_df = df[(df["time"] >= test_start) & (df["time"] < test_end)]

        if len(train_df) > 0 and len(test_df) > 0:
            splits.append((train_df, test_df))

    return splits
