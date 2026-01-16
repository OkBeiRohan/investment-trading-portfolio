"""
Extended QuestDB Loader with SQL File Resolution and Label Loading
"""

from pathlib import Path
from datetime import datetime
import logging
import pandas as pd
from sqlalchemy import create_engine, text

logger = logging.getLogger(__name__)


def add_label_loading_method():
    """
    Method to add to QuestDBLoader class

    Copy this into sql_loader.py after the load_lightgbm_features method
    """

    def load_training_labels(
        self,
        start_date: datetime,
        end_date: datetime,
        horizon_minutes: int = 5,
    ) -> pd.DataFrame:
        """
        Load pre-computed training labels from QuestDB

        Args:
            start_date: Start of training period
            end_date: End of training period
            horizon_minutes: Prediction horizon (5, 15, 30 minutes)

        Returns:
            DataFrame with columns: timestamp, label, future_return, atr_threshold
        """
        logger.info(
            f"Loading training labels (horizon={horizon_minutes}min) "
            f"from {start_date} to {end_date}"
        )

        # Load SQL from file if available
        try:
            if self.sql_dir:
                labels_sql = self._load_sql("training-labels/get-by-time-range")
                # Replace $1, $2, $3 with named parameters
                labels_sql = (
                    labels_sql.replace("$1", ":start_date")
                    .replace("$2", ":end_date")
                    .replace("$3", ":horizon_minutes")
                )
            else:
                labels_sql = """
                    SELECT * FROM training_labels_1m 
                    WHERE timestamp >= :start_date 
                    AND timestamp < :end_date 
                    AND horizon_minutes = :horizon_minutes
                    ORDER BY timestamp ASC
                """
        except FileNotFoundError:
            logger.warning("Using fallback inline query for training_labels_1m")
            labels_sql = """
                SELECT * FROM training_labels_1m 
                WHERE timestamp >= :start_date 
                AND timestamp < :end_date 
                AND horizon_minutes = :horizon_minutes
                ORDER BY timestamp ASC
            """

        query = text(labels_sql)

        df = pd.read_sql(
            query,
            self.engine,
            params={
                "start_date": start_date,
                "end_date": end_date,
                "horizon_minutes": horizon_minutes,
            },
        )

        logger.info(f"Loaded {len(df)} labels for {horizon_minutes}min horizon")

        return df
