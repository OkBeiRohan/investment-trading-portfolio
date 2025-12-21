"""
Example: Fetching Market Data from QuestDB in Training Pipeline

This example demonstrates how to use shared SQL queries from @repo/schema
to fetch market data for feature engineering in the Python training pipeline.
"""

import psycopg2
from datetime import datetime, timedelta
from typing import Any
import pandas as pd
from kedro.pipeline import Pipeline, node

from training_pipeline.utils.sql_loader import load_sql


def fetch_candles_for_training(
    instrument_key: str,
    interval: str = "1m",
    days_back: int = 30,
    questdb_config: dict[str, Any] | None = None,
) -> pd.DataFrame:
    """
    Fetch historical candles from QuestDB for training.

    Uses shared SQL queries from @repo/schema to ensure consistency
    with TypeScript services.

    Args:
        instrument_key: Instrument to fetch (e.g., 'NSE_INDEX|Nifty 50')
        interval: Candle interval (e.g., '1m', '5m', '1h', '1D')
        days_back: Number of days of historical data to fetch
        questdb_config: QuestDB connection config (host, port, user, database)

    Returns:
        DataFrame with columns: timestamp, instrument_key, interval,
                                open, high, low, close, volume, open_interest

    Example:
        >>> df = fetch_candles_for_training('NSE_INDEX|Nifty 50', '1m', 30)
        >>> print(df.shape)
        (11250, 9)  # ~375 candles/day * 30 days
    """
    # Default QuestDB config
    if questdb_config is None:
        questdb_config = {
            "host": "localhost",
            "port": 8812,  # PostgreSQL wire protocol
            "user": "admin",
            "database": "qdb",
        }

    # Calculate time range
    end_time = datetime.now()
    start_time = end_time - timedelta(days=days_back)

    # Load SQL from @repo/schema (same query used by TypeScript services!)
    sql = load_sql("candles/select-by-time-range")

    # Connect to QuestDB
    conn = psycopg2.connect(**questdb_config)

    try:
        # Execute query with parameters
        df = pd.read_sql_query(
            sql,
            conn,
            params=[
                instrument_key,
                interval,
                start_time.isoformat(),
                end_time.isoformat(),
            ],
        )

        # Convert timestamp column to datetime
        df["timestamp"] = pd.to_datetime(df["timestamp"])

        return df

    finally:
        conn.close()


def fetch_quotes_for_training(
    instrument_key: str,
    days_back: int = 7,
    questdb_config: dict[str, Any] | None = None,
) -> pd.DataFrame:
    """
    Fetch tick-level quotes from QuestDB for training.

    Args:
        instrument_key: Instrument to fetch
        days_back: Number of days of historical data
        questdb_config: QuestDB connection config

    Returns:
        DataFrame with tick data
    """
    if questdb_config is None:
        questdb_config = {
            "host": "localhost",
            "port": 8812,
            "user": "admin",
            "database": "qdb",
        }

    end_time = datetime.now()
    start_time = end_time - timedelta(days=days_back)

    # Load SQL from @repo/schema
    sql = load_sql("quotes/select-by-time-range")

    conn = psycopg2.connect(**questdb_config)

    try:
        df = pd.read_sql_query(
            sql,
            conn,
            params=[
                instrument_key,
                start_time.isoformat(),
                end_time.isoformat(),
            ],
        )

        df["timestamp"] = pd.to_datetime(df["timestamp"])
        return df

    finally:
        conn.close()


def fetch_greeks_for_training(
    instrument_key: str,
    days_back: int = 7,
    questdb_config: dict[str, Any] | None = None,
) -> pd.DataFrame:
    """
    Fetch option greeks snapshots from QuestDB for training.

    Args:
        instrument_key: Option instrument to fetch
        days_back: Number of days of historical data
        questdb_config: QuestDB connection config

    Returns:
        DataFrame with greeks data
    """
    if questdb_config is None:
        questdb_config = {
            "host": "localhost",
            "port": 8812,
            "user": "admin",
            "database": "qdb",
        }

    end_time = datetime.now()
    start_time = end_time - timedelta(days=days_back)

    # Load SQL from @repo/schema
    sql = load_sql("greeks/select-by-time-range")

    conn = psycopg2.connect(**questdb_config)

    try:
        df = pd.read_sql_query(
            sql,
            conn,
            params=[
                instrument_key,
                start_time.isoformat(),
                end_time.isoformat(),
            ],
        )

        df["timestamp"] = pd.to_datetime(df["timestamp"])
        return df

    finally:
        conn.close()


def check_data_availability(
    instrument_key: str,
    interval: str,
    start_time: datetime,
    end_time: datetime,
    questdb_config: dict[str, Any] | None = None,
) -> bool:
    """
    Check if candle data exists for the specified range.

    Useful before running training to verify data availability.

    Args:
        instrument_key: Instrument to check
        interval: Candle interval
        start_time: Start of range
        end_time: End of range
        questdb_config: QuestDB connection config

    Returns:
        True if data exists, False otherwise
    """
    if questdb_config is None:
        questdb_config = {
            "host": "localhost",
            "port": 8812,
            "user": "admin",
            "database": "qdb",
        }

    # Load SQL from @repo/schema
    sql = load_sql("candles/check-data-exists")

    conn = psycopg2.connect(**questdb_config)

    try:
        cursor = conn.cursor()
        cursor.execute(
            sql,
            [
                instrument_key,
                interval,
                start_time.isoformat(),
                end_time.isoformat(),
            ],
        )

        result = cursor.fetchone()
        count = result[0] if result else 0

        return count > 0

    finally:
        conn.close()


# Kedro pipeline example
def create_data_ingestion_pipeline() -> Pipeline:
    """
    Create Kedro pipeline for ingesting market data from QuestDB.

    This pipeline fetches data using shared SQL queries from @repo/schema.
    """
    return Pipeline(
        [
            node(
                func=fetch_candles_for_training,
                inputs=["params:instrument_key", "params:interval", "params:days_back"],
                outputs="raw_candles",
                name="fetch_candles_node",
            ),
            node(
                func=fetch_quotes_for_training,
                inputs=["params:instrument_key", "params:days_back"],
                outputs="raw_quotes",
                name="fetch_quotes_node",
            ),
            node(
                func=fetch_greeks_for_training,
                inputs=["params:instrument_key", "params:days_back"],
                outputs="raw_greeks",
                name="fetch_greeks_node",
            ),
        ]
    )
