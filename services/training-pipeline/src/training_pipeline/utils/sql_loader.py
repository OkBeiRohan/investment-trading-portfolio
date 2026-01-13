"""
QuestDB Data Loader for Training Pipeline

Loads pre-computed features from QuestDB (computed by compute-engine)
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

import pandas as pd
from sqlalchemy import create_engine, text

logger = logging.getLogger(__name__)


class QuestDBLoader:
    """
    Loads historical features from QuestDB for model training

    Features are pre-computed by compute-engine (Rust/NAPI) and stored by market-feeder.
    This loader simply fetches the stored features for training.
    """

    def __init__(self, connection_string: str):
        """
        Initialize QuestDB connection

        Args:
            connection_string: PostgreSQL wire protocol connection string
                              e.g., 'postgresql://admin:quest@localhost:8812/qdb'
        """
        self.engine = create_engine(connection_string)
        logger.info(f"QuestDB loader initialized")

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

        query = text(
            """
            SELECT 
                timestamp,
                -- Index Breadth (6)
                pct_stocks_above_vwap,
                pct_stocks_above_ema20,
                weighted_return_top10,
                advance_decline_ratio,
                breadth_momentum_5m,
                breadth_volatility,
                -- NIFTY FUTURE (9)
                fut_price_vs_vwap,
                fut_range_position,
                fut_return_1m,
                fut_return_5m,
                fut_atr_percent,
                fut_volume_zscore,
                fut_oi_change,
                fut_rsi_14,
                fut_macd,
                -- Options (11)
                atm_iv,
                atm_iv_change,
                iv_skew,
                gamma_atm,
                vega_atm,
                theta_atm,
                pcr_oi,
                pcr_volume,
                max_pain_distance,
                charm_atm,
                vanna_atm,
                -- Volatility (4)
                india_vix,
                realized_vol_5m,
                realized_vol_15m,
                vol_expansion_ratio,
                -- Time (3)
                minutes_from_open,
                minutes_to_close,
                day_of_week,
                -- Target (for labeling)
                close_price
            FROM lightgbm_features
            WHERE symbol = :symbol
              AND timestamp >= :start_date
              AND timestamp < :end_date
            ORDER BY timestamp ASC
        """
        )

        df = pd.read_sql(
            query,
            self.engine,
            params={
                "symbol": symbol,
                "start_date": start_date,
                "end_date": end_date,
            },  # type: ignore[arg-type]
        )

        logger.info(
            f"Loaded {len(df)} rows with {len(df.columns)} columns "
            f"(33 features + timestamp + close_price)"
        )

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
            "Compute-engine must first define TFT feature schema."
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
            "Compute-engine must first define LiT LOB tensor schema."
        )

    def get_available_date_range(
        self, table: str = "lightgbm_features"
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

        result = pd.read_sql(query, self.engine)

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
