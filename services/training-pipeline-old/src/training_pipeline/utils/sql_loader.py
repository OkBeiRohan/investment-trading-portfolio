"""
QuestDB Data Loader for Training Pipeline

Loads pre-computed features from QuestDB (computed by compute-engine)
Uses centralized SQL files from packages/schema/sql/
"""

import logging
from datetime import datetime
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine, text

logger = logging.getLogger(__name__)


class QuestDBLoader:
    """
    Loads historical features from QuestDB for model training

    Features are pre-computed by compute-engine (Rust/NAPI) and stored by market-feeder.
    This loader simply fetches the stored features for training.

    Uses SQL files from: packages/schema/sql/
    """

    def __init__(self, connection_string: str):
        """
        Initialize QuestDB connection

        Args:
            connection_string: PostgreSQL wire protocol connection string
                              e.g., 'postgresql://admin:quest@localhost:8812/qdb'
        """
        self.engine = create_engine(connection_string)

        # Resolve SQL directory (packages/schema/sql)
        self.sql_dir = (
            Path(__file__).parent.parent.parent.parent.parent.parent
            / "packages"
            / "schema"
            / "sql"
        )

        if not self.sql_dir.exists():
            logger.warning(
                f"SQL directory not found at {self.sql_dir}. "
                "Falling back to inline queries."
            )
            self.sql_dir = None
        else:
            logger.info(f"Using SQL files from: {self.sql_dir}")

        logger.info("QuestDB loader initialized")

    def _load_sql(self, sql_path: str) -> str:
        """
        Load SQL query from file

        Args:
            sql_path: Relative path to SQL file (e.g., 'market-state/get-by-time-range')

        Returns:
            SQL query string
        """
        if self.sql_dir is None:
            raise FileNotFoundError(
                f"SQL directory not configured. Cannot load {sql_path}.sql"
            )

        sql_file = self.sql_dir / f"{sql_path}.sql"

        if not sql_file.exists():
            raise FileNotFoundError(f"SQL file not found: {sql_file}")

        with open(sql_file, "r", encoding="utf-8") as f:
            sql = f.read().strip()

        logger.debug(f"Loaded SQL from: {sql_file}")
        return sql

    def load_lightgbm_features(
        self,
        start_date: datetime,
        end_date: datetime,
        symbol: str = "NIFTY",
    ) -> pd.DataFrame:
        """
        Load LightGBM features (33 features from Market State Encoder)

        Uses SQL file: packages/schema/sql/market-state/get-by-time-range.sql

        Args:
            start_date: Start of training period
            end_date: End of training period
            symbol: Index symbol (default: NIFTY) - currently unused, all indices included

        Returns:
            DataFrame with 33 features from market_state_1m table:
            - 6 index breadth features
            - 9 NIFTY future features
            - 11 options features
            - 4 volatility features
            - 3 time context features
        """
        logger.info(
            f"Loading LightGBM features for {symbol} "
            f"from {start_date} to {end_date}"
        )

        # Load SQL query from file
        try:
            market_state_sql = self._load_sql("market-state/get-by-time-range")
            # Replace $1, $2 with named parameters (SQLAlchemy format)
            market_state_sql = market_state_sql.replace("$1", ":start_date").replace(
                "$2", ":end_date"
            )
        except (FileNotFoundError, AttributeError):
            logger.warning("SQL file not found, using fallback inline query")
            market_state_sql = """
                SELECT * FROM market_state_1m 
                WHERE timestamp >= :start_date AND timestamp < :end_date 
                ORDER BY timestamp ASC
            """

        query = text(market_state_sql)

        df = pd.read_sql(  # type: ignore
            query,
            self.engine,
            params={
                "start_date": start_date,
                "end_date": end_date,
            },  # type: ignore[arg-type]
        )

        logger.info(
            f"Loaded {len(df)} rows with {len(df.columns)} columns from market_state_1m"
        )

        # Verify we have the expected 33 features + timestamp + instrument_key = 35 columns
        expected_cols = 35  # 33 features + timestamp + instrument_key
        if len(df.columns) < expected_cols:
            logger.warning(
                f"Expected at least {expected_cols} columns, got {len(df.columns)}. "
                "Check if market_state_1m schema matches compute-engine output."
            )

        return df

    def load_training_labels(
        self,
        start_date: datetime,
        end_date: datetime,
        horizon_minutes: int = 5,
    ) -> pd.DataFrame:
        """
        Load pre-computed training labels from QuestDB

        Uses SQL file: packages/schema/sql/training-labels/get-by-time-range.sql

        Args:
            start_date: Start of training period
            end_date: End of training period
            horizon_minutes: Prediction horizon (5, 15, 30 minutes)

        Returns:
            DataFrame with columns: timestamp, horizon_minutes, label, future_return, atr_threshold
        """
        logger.info(
            f"Loading training labels (horizon={horizon_minutes}min) "
            f"from {start_date} to {end_date}"
        )

        # Load SQL query from file
        try:
            labels_sql = self._load_sql("training-labels/get-by-time-range")
            # Replace $1, $2, $3 with named parameters (SQLAlchemy format)
            labels_sql = (
                labels_sql.replace("$1", ":start_date")
                .replace("$2", ":end_date")
                .replace("$3", ":horizon_minutes")
            )
        except (FileNotFoundError, AttributeError):
            logger.warning("SQL file not found, using fallback inline query")
            labels_sql = """
                SELECT * FROM training_labels_1m 
                WHERE timestamp >= :start_date 
                AND timestamp < :end_date 
                AND horizon_minutes = :horizon_minutes
                ORDER BY timestamp ASC
            """

        query = text(labels_sql)

        df = pd.read_sql(  # type: ignore
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

    def load_tft_features(
        self,
        start_date: datetime,
        end_date: datetime,
        symbol: str = "NIFTY",
    ) -> pd.DataFrame:
        """
        Load Temporal Fusion Transformer features (120 timesteps × 15 features)

        Returns:
            DataFrame with temporal features
        """
        logger.info(f"Loading TFT features for {symbol} (PLACEHOLDER)")

        # TODO: Implement when TFT feature schema finalized
        raise NotImplementedError(
            "TFT feature loading not yet implemented. "
            "@repo/compute-engine must first define TFT feature schema."
        )

    def load_lit_features(
        self,
        start_date: datetime,
        end_date: datetime,
        symbol: str = "NIFTY",
    ) -> pd.DataFrame:
        """
        Load LOB Informed Transformer features (60 snapshots × 80 LOB levels)

        Returns:
            DataFrame with LOB tensor data
        """
        logger.info(f"Loading LiT features for {symbol} (PLACEHOLDER)")

        # TODO: Implement when LiT feature schema finalized
        raise NotImplementedError(
            "LiT feature loading not yet implemented. "
            "@repo/compute-engine must first define LiT LOB tensor schema."
        )

    def get_available_date_range(
        self, table: str = "market_state_1m"
    ) -> tuple[datetime, datetime]:
        """
        Get available date range in QuestDB

        Returns:
            (min_date, max_date)
        """
        query = text(
            f"""
            SELECT 
                MIN(timestamp) as min_date,
                MAX(timestamp) as max_date
            FROM {table}
        """
        )

        result = pd.read_sql(query, self.engine)  # type: ignore

        min_date = result["min_date"].iloc[0]
        max_date = result["max_date"].iloc[0]

        logger.info(f"Available data: {min_date} to {max_date}")

        return (min_date, max_date)

    def close(self):
        """Close database connection"""
        self.engine.dispose()
        logger.info("QuestDB connection closed")
