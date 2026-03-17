"""
Batch data loader for RAM-efficient training.

Loads training data in time-based batches via QuestDBTrainingLoader
to avoid loading the entire dataset into memory at once.
"""

import logging
from datetime import datetime, timedelta
from typing import Iterator

import pandas as pd

from .data_loader import QuestDBTrainingLoader

logger = logging.getLogger(__name__)


class BatchDataLoader:
    """
    Load training data in time-based batches to reduce RAM usage.

    Example::

        loader = QuestDBTrainingLoader()
        batch_loader = BatchDataLoader(
            loader=loader,
            instrument_key="NSE_INDEX|Nifty 50",
            start_date="2023-01-01",
            end_date="2025-12-31",
            batch_days=30,
        )
        for features, labels in batch_loader:
            model.partial_fit(features, labels)
    """

    def __init__(
        self,
        loader: QuestDBTrainingLoader,
        instrument_key: str,
        start_date: str,
        end_date: str,
        batch_days: int = 30,
        interval_value: int = 1,
        interval_unit: str = "minute",
    ):
        self.loader = loader
        self.instrument_key = instrument_key
        self.start_date = datetime.strptime(start_date, "%Y-%m-%d")
        self.end_date = datetime.strptime(end_date, "%Y-%m-%d")
        self.batch_days = batch_days
        self.interval_value = interval_value
        self.interval_unit = interval_unit

        total_days = (self.end_date - self.start_date).days
        self.total_batches = (total_days // batch_days) + (1 if total_days % batch_days else 0)
        logger.info(
            "BatchDataLoader: %s to %s, %d-day batches, %d total",
            start_date, end_date, batch_days, self.total_batches,
        )

    def __iter__(self) -> Iterator[tuple[pd.DataFrame, pd.DataFrame]]:
        current = self.start_date
        batch_num = 0

        while current < self.end_date:
            batch_start = current
            batch_end = min(current + timedelta(days=self.batch_days), self.end_date)
            batch_num += 1

            start_str = batch_start.strftime("%Y-%m-%d %H:%M:%S")
            end_str = batch_end.strftime("%Y-%m-%d %H:%M:%S")

            logger.info("Batch %d/%d: %s – %s", batch_num, self.total_batches, start_str, end_str)

            features = self.loader.load_features(
                self.instrument_key, start_str, end_str,
                self.interval_value, self.interval_unit,
            )
            labels = self.loader.load_labels(self.instrument_key, start_str, end_str)

            if features.empty:
                logger.warning("Batch %d: no features, skipping", batch_num)
                current = batch_end
                continue
            if labels.empty:
                logger.warning("Batch %d: no labels, skipping", batch_num)
                current = batch_end
                continue

            logger.info("Batch %d: %d features, %d labels", batch_num, len(features), len(labels))
            yield features, labels
            current = batch_end


def get_date_ranges(
    start_date: str,
    end_date: str,
    batch_days: int = 30,
) -> list[tuple[str, str]]:
    """Generate (start, end) string pairs for batch processing."""
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    ranges: list[tuple[str, str]] = []
    current = start
    while current < end:
        batch_end = min(current + timedelta(days=batch_days), end)
        ranges.append((
            current.strftime("%Y-%m-%d %H:%M:%S"),
            batch_end.strftime("%Y-%m-%d %H:%M:%S"),
        ))
        current = batch_end
    return ranges
