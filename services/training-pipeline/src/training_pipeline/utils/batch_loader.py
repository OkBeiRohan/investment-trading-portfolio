"""
Batch data loader for RAM-efficient training.

This module provides utilities to load training data in batches
to avoid loading the entire dataset into memory at once.
"""

from datetime import datetime, timedelta
from typing import Iterator
import pandas as pd
import logging
from kedro.io import DataCatalog

logger = logging.getLogger(__name__)


class BatchDataLoader:
    """
    Load training data in time-based batches to reduce RAM usage.

    Example usage:
        loader = BatchDataLoader(
            catalog=context.catalog,
            start_date="2023-01-01",
            end_date="2025-12-31",
            batch_days=30,
        )

        for batch_num, (features, labels) in enumerate(loader):
            model.partial_fit(features, labels)
    """

    def __init__(
        self,
        catalog: DataCatalog,
        start_date: str,
        end_date: str,
        batch_days: int = 30,
        features_dataset: str = "features_batch",
        labels_dataset: str = "labels_batch",
    ):
        """
        Initialize batch data loader.

        Args:
            catalog: Kedro data catalog
            start_date: Training start date (YYYY-MM-DD)
            end_date: Training end date (YYYY-MM-DD)
            batch_days: Number of days per batch
            features_dataset: Name of features dataset in catalog
            labels_dataset: Name of labels dataset in catalog
        """
        self.catalog = catalog
        self.start_date = datetime.strptime(start_date, "%Y-%m-%d")
        self.end_date = datetime.strptime(end_date, "%Y-%m-%d")
        self.batch_days = batch_days
        self.features_dataset = features_dataset
        self.labels_dataset = labels_dataset

        # Calculate total batches
        total_days = (self.end_date - self.start_date).days
        self.total_batches = (total_days // batch_days) + (
            1 if total_days % batch_days else 0
        )

        logger.info(
            f"BatchDataLoader initialized: {start_date} to {end_date}, "
            f"{batch_days} days per batch, {self.total_batches} total batches"
        )

    def __iter__(self) -> Iterator[tuple[pd.DataFrame, pd.DataFrame]]:
        """
        Iterate over data batches.

        Yields:
            tuple[pd.DataFrame, pd.DataFrame]: (features, labels) for each batch
        """
        current_date = self.start_date
        batch_num = 0

        while current_date < self.end_date:
            batch_start = current_date
            batch_end = min(
                current_date + timedelta(days=self.batch_days), self.end_date
            )

            batch_num += 1

            logger.info(
                f"Loading batch {batch_num}/{self.total_batches}: "
                f"{batch_start.date()} to {batch_end.date()}"
            )

            # Load features with dynamic parameters
            features = self._load_dataset(self.features_dataset, batch_start, batch_end)

            # Load labels with dynamic parameters
            labels = self._load_dataset(self.labels_dataset, batch_start, batch_end)

            if len(features) == 0:
                logger.warning(f"Batch {batch_num} has no features, skipping")
                current_date = batch_end
                continue

            if len(labels) == 0:
                logger.warning(f"Batch {batch_num} has no labels, skipping")
                current_date = batch_end
                continue

            logger.info(
                f"Batch {batch_num} loaded: {len(features)} features, {len(labels)} labels"
            )

            yield features, labels

            current_date = batch_end

    def _load_dataset(
        self,
        dataset_name: str,
        batch_start: datetime,
        batch_end: datetime,
    ) -> pd.DataFrame:
        """
        Load dataset with dynamic time parameters.

        Args:
            dataset_name: Name of dataset in catalog
            batch_start: Batch start timestamp
            batch_end: Batch end timestamp

        Returns:
            pd.DataFrame: Loaded data
        """
        # Create modified catalog entry with batch-specific params
        from kedro_datasets.pandas import SQLQueryDataset

        # Get base dataset config
        base_config = self.catalog._datasets[dataset_name]._describe()

        # Create new dataset with updated params
        dataset = SQLQueryDataset(
            filepath=base_config["filepath"],
            credentials=self.catalog._credentials[base_config["credentials"]],
            load_args={
                "params": {
                    "training_start": batch_start.strftime("%Y-%m-%d %H:%M:%S"),
                    "training_end": batch_end.strftime("%Y-%m-%d %H:%M:%S"),
                }
            },
        )

        return dataset.load()


def get_date_ranges(
    start_date: str,
    end_date: str,
    batch_days: int = 30,
) -> list[tuple[str, str]]:
    """
    Generate list of date ranges for batch processing.

    Useful for walk-forward validation with batches.

    Args:
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)
        batch_days: Days per batch

    Returns:
        List of (batch_start, batch_end) tuples as ISO strings

    Example:
        >>> ranges = get_date_ranges("2023-01-01", "2023-03-01", 30)
        >>> print(ranges)
        [
            ("2023-01-01 00:00:00", "2023-01-31 00:00:00"),
            ("2023-01-31 00:00:00", "2023-03-01 00:00:00"),
        ]
    """
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")

    ranges: list[tuple[str, str]] = []
    current = start

    while current < end:
        batch_end = min(current + timedelta(days=batch_days), end)
        ranges.append(
            (
                current.strftime("%Y-%m-%d %H:%M:%S"),
                batch_end.strftime("%Y-%m-%d %H:%M:%S"),
            )
        )
        current = batch_end

    return ranges
