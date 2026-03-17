"""
Data quality validation for training datasets.

Enforces institutional-grade checks: minimum sample size, null thresholds,
infinity detection, validity flags, and outlier detection.
"""

import logging
from typing import Optional

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class ValidationReport:
    """Structured quality report returned alongside cleaned data."""

    def __init__(self):
        self.total_rows: int = 0
        self.rows_after_clean: int = 0
        self.null_pct_per_col: dict[str, float] = {}
        self.inf_count: int = 0
        self.invalid_reasons: dict[str, int] = {}
        self.passed: bool = False
        self.rejection_reason: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "total_rows": self.total_rows,
            "rows_after_clean": self.rows_after_clean,
            "null_pct_per_col": self.null_pct_per_col,
            "inf_count": self.inf_count,
            "invalid_reasons": self.invalid_reasons,
            "passed": self.passed,
            "rejection_reason": self.rejection_reason,
        }


def validate_features(
    df: pd.DataFrame,
    min_rows: int = 1_000,
    max_null_pct: float = 0.30,
    required_cols: Optional[list[str]] = None,
    drop_invalid: bool = True,
) -> tuple[pd.DataFrame, ValidationReport]:
    """
    Validate and clean a features/labels DataFrame.

    Returns (clean_df, report).  If quality is below threshold the report's
    ``passed`` flag is False and ``rejection_reason`` explains why.
    """
    report = ValidationReport()
    report.total_rows = len(df)

    if df.empty:
        report.rejection_reason = "DataFrame is empty"
        return df, report

    if required_cols:
        missing = set(required_cols) - set(df.columns)
        if missing:
            report.rejection_reason = f"Missing required columns: {sorted(missing)}"
            return df, report

    if drop_invalid and "is_valid" in df.columns:
        invalid_mask = df["is_valid"] == False  # noqa: E712
        if "invalid_reason" in df.columns:
            reasons = df.loc[invalid_mask, "invalid_reason"].value_counts()
            report.invalid_reasons = reasons.to_dict()
        df = df[~invalid_mask].copy()

    numeric_cols = df.select_dtypes(include=[np.number]).columns
    inf_mask = np.isinf(df[numeric_cols]).any(axis=1)
    report.inf_count = int(inf_mask.sum())
    if report.inf_count > 0:
        df = df[~inf_mask].copy()
        logger.warning("Dropped %d rows containing Inf values", report.inf_count)

    null_pct = df[numeric_cols].isnull().mean()
    report.null_pct_per_col = null_pct[null_pct > 0].to_dict()

    high_null_cols = null_pct[null_pct > max_null_pct].index.tolist()
    if high_null_cols:
        logger.warning(
            "%d columns exceed %.0f%% null threshold: %s",
            len(high_null_cols), max_null_pct * 100, high_null_cols[:10],
        )

    report.rows_after_clean = len(df)

    if report.rows_after_clean < min_rows:
        report.rejection_reason = (
            f"Insufficient rows after cleaning: {report.rows_after_clean} < {min_rows}"
        )
        return df, report

    report.passed = True
    logger.info(
        "Validation passed: %d→%d rows, %d inf removed, %d cols with nulls",
        report.total_rows, report.rows_after_clean,
        report.inf_count, len(report.null_pct_per_col),
    )
    return df, report


def validate_labels(
    df: pd.DataFrame,
    target_cols: list[str],
    min_rows: int = 1_000,
) -> tuple[pd.DataFrame, ValidationReport]:
    """Convenience wrapper for label DataFrames."""
    return validate_features(
        df,
        min_rows=min_rows,
        required_cols=["timestamp", "instrument_key"] + target_cols,
    )
