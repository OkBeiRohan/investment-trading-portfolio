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
        self._cache = {}
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

        Args:
            start_date: Start of training period
            end_date: End of training period
            symbol: Index symbol (default: NIFTY)

        Returns:
            DataFrame with 33 features + timestamp + close_price
        """
        logger.info(
            f"Loading LightGBM features for {symbol} "
            f"from {start_date} to {end_date}"
        )

        # Determine instrument_key based on symbol
        if symbol == "NIFTY":
            instrument_key = "NSE_INDEX|Nifty 50"
        elif symbol == "BANKNIFTY":
            instrument_key = "NSE_INDEX|Nifty Bank"
        elif symbol == "FINNIFTY":
            instrument_key = "NSE_INDEX|Nifty Fin Services"
        else:
            instrument_key = f"NSE_INDEX|{symbol}"

        query = text(
            """
            SELECT 
                ms.timestamp,
                -- Market Structure (8)
                ms.price_vs_vwap,
                ms.price_vs_day_high,
                ms.price_vs_day_low,
                ms.range_position,
                ms.prev_day_high_dist,
                ms.prev_day_low_dist,
                ms.weekly_high_dist,
                ms.weekly_low_dist,
                -- Momentum & Trend (8)
                ms.rsi_5,
                ms.rsi_14,
                ms.rsi_21,
                ms.macd_hist,
                ms.ema_9_slope,
                ms.ema_21_slope,
                ms.adx,
                ms.roc_5,
                -- Volatility (5)
                ms.atr_percent,
                ms.realized_vol_5m,
                ms.realized_vol_15m,
                ms.vol_expansion_ratio,
                ms.india_vix,
                -- Options (9)
                ms.atm_iv,
                ms.atm_iv_change,
                ms.delta_atm,
                ms.gamma_atm,
                ms.vega_atm,
                ms.theta_atm,
                ms.pcr_oi,
                ms.pcr_volume,
                ms.max_pain_dist,
                -- Time Context (3)
                ms.minutes_from_open,
                ms.minutes_to_close,
                ms.day_of_week,
                -- Target (from candles)
                mc.close as close_price
            FROM market_state_1m ms
            LEFT JOIN market_candles mc 
                ON ms.timestamp = mc.timestamp 
                AND mc.instrument_key = :instrument_key
                AND mc.interval_value = 1
                AND mc.interval_unit = 'minute'
            WHERE ms.timestamp >= :start_date
              AND ms.timestamp < :end_date
            ORDER BY ms.timestamp ASC
        """
        )

        df = pd.read_sql(  # type: ignore
            query,
            self.engine,
            params={
                "instrument_key": instrument_key,
                "start_date": start_date,
                "end_date": end_date,
            },  # type: ignore[arg-type]
        )

        logger.info(
            f"Loaded {len(df)} rows with {len(df.columns)} columns "
            f"(33 features + timestamp + close_price)"
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

        # Try loading SQL from file if available
        try:
            if self.sql_dir:
                labels_sql = self._load_sql("training-labels/get-by-time-range")
                # Replace $1, $2, $3 with named parameters (SQLAlchemy format)
                labels_sql = (
                    labels_sql.replace("$1", ":start_date")
                    .replace("$2", ":end_date")
                    .replace("$3", ":horizon_minutes")
                )
            else:
                # Fallback inline query
                labels_sql = """
                    SELECT * FROM training_labels_1m 
                    WHERE timestamp >= :start_date 
                    AND timestamp < :end_date 
                    AND horizon_minutes = :horizon_minutes
                    ORDER BY timestamp ASC
                """
        except FileNotFoundError:
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

        result = pd.read_sql(query, self.engine) # type: ignore

        min_date = result["min_date"].iloc[0]
        max_date = result["max_date"].iloc[0]

        logger.info(f"Available data: {min_date} to {max_date}")

        return (min_date, max_date)

    def close(self):
        """Close database connection"""
        self.engine.dispose()
        logger.info("QuestDB connection closed")
        if use_cache and query_path in self._cache:
            return self._cache[query_path]

        sql_file = self.sql_dir / f"{query_path}.sql"

        if not sql_file.exists():
            raise FileNotFoundError(
                f"SQL query not found: {sql_file}. "
                f"Available queries: {self.list_queries()}"
            )

        with open(sql_file, "r", encoding="utf-8") as f:
            sql = f.read()

        if use_cache:
            self._cache[query_path] = sql

        return sql
