"""
QuestDB training data loader using @repo/schema SQL files.

Replaces Kedro's SQLQueryDataset catalog with direct psycopg2 queries
parameterized by the shared SQL definitions in packages/schema/sql/.
"""

import os
import logging
from pathlib import Path
from typing import Optional

import pandas as pd
import psycopg2

logger = logging.getLogger(__name__)

DEFAULT_SCHEMA_SQL_DIR = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "..", "..", "..",
    "packages", "schema", "sql",
)


class QuestDBTrainingLoader:
    """Loads training data from QuestDB using @repo/schema SQL files."""

    def __init__(
        self,
        db_uri: Optional[str] = None,
        schema_sql_dir: Optional[str] = None,
    ):
        self.db_uri = db_uri or self._build_uri_from_env()
        self.sql_dir = Path(schema_sql_dir or DEFAULT_SCHEMA_SQL_DIR).resolve()
        if not self.sql_dir.exists():
            raise FileNotFoundError(
                f"Schema SQL directory not found: {self.sql_dir}. "
                "Set SCHEMA_SQL_DIR or pass schema_sql_dir explicitly."
            )
        logger.info("QuestDBTrainingLoader initialised — sql_dir=%s", self.sql_dir)

    @staticmethod
    def _build_uri_from_env() -> str:
        host = os.environ.get("QUESTDB_HOST", "localhost")
        port = os.environ.get("QUESTDB_PORT", os.environ.get("QUESTDB_PG_PORT", "8812"))
        user = os.environ.get("QUESTDB_USER", "admin")
        password = os.environ.get("QUESTDB_PASSWORD", "quest")
        return f"postgresql://{user}:{password}@{host}:{port}/qdb"

    def _read_sql(self, relative_path: str) -> str:
        full = self.sql_dir / relative_path
        if not full.exists():
            raise FileNotFoundError(f"SQL file not found: {full}")
        return full.read_text()

    def _query(self, sql: str, params: tuple) -> pd.DataFrame:
        with psycopg2.connect(self.db_uri) as conn:
            return pd.read_sql(sql, conn, params=params)

    # ------------------------------------------------------------------
    # Public loaders — each wraps a @repo/schema SQL file
    # ------------------------------------------------------------------

    def load_features(
        self,
        instrument_key: str,
        start: str,
        end: str,
        interval_value: int = 1,
        interval_unit: str = "minute",
    ) -> pd.DataFrame:
        """Load validated features via instrument-features/get-by-time-range-train.sql"""
        sql = self._read_sql("instrument-features/get-by-time-range-train.sql")
        df = self._query(sql, (instrument_key, interval_value, interval_unit, start, end))
        logger.info(
            "Loaded %d feature rows [%s] %s–%s (%d%s)",
            len(df), instrument_key, start, end, interval_value, interval_unit,
        )
        return df

    def load_labels(
        self,
        instrument_key: str,
        start: str,
        end: str,
    ) -> pd.DataFrame:
        """Load all-horizon labels via training-labels/get-all-horizons-train.sql"""
        sql = self._read_sql("training-labels/get-all-horizons-train.sql")
        df = self._query(sql, (instrument_key, start, end))
        logger.info("Loaded %d label rows [%s] %s–%s", len(df), instrument_key, start, end)
        return df

    def load_labels_by_horizon(
        self,
        instrument_key: str,
        interval_value: int,
        interval_unit: str,
        start: str,
        end: str,
    ) -> pd.DataFrame:
        """Load horizon-specific labels via training-labels/get-by-horizon.sql"""
        sql = self._read_sql("training-labels/get-by-horizon.sql")
        df = self._query(sql, (instrument_key, interval_value, interval_unit, start, end))
        logger.info(
            "Loaded %d label rows (horizon %d%s) [%s]",
            len(df), interval_value, interval_unit, instrument_key,
        )
        return df

    def load_cpcv_folds(
        self,
        instrument_key: str,
        dataset_name: str,
    ) -> pd.DataFrame:
        """Load CPCV fold definitions via dataset-folds/get-by-dataset.sql"""
        sql = self._read_sql("dataset-folds/get-by-dataset.sql")
        df = self._query(sql, (instrument_key, dataset_name))
        logger.info(
            "Loaded %d fold rows [%s / %s]", len(df), instrument_key, dataset_name,
        )
        return df

    def load_candles(
        self,
        instrument_key: str,
        interval_value: int,
        interval_unit: str,
        start: str,
        end: str,
        limit: int = 500_000,
    ) -> pd.DataFrame:
        """Load OHLCV candles via candles/get-by-time-range.sql (existing)."""
        sql = self._read_sql("candles/get-by-time-range.sql")
        df = self._query(sql, (instrument_key, interval_value, interval_unit, start, end, limit))
        logger.info("Loaded %d candle rows [%s]", len(df), instrument_key)
        return df

    def load_tick_data(
        self,
        instrument_key: str,
        start: str,
        end: str,
        limit: int = 1_000_000,
    ) -> pd.DataFrame:
        """Load tick data via tick-data/get-by-time-range.sql (existing)."""
        sql = self._read_sql("tick-data/get-by-time-range.sql")
        df = self._query(sql, (instrument_key, start, end, limit))
        logger.info("Loaded %d tick rows [%s]", len(df), instrument_key)
        return df

    def load_features_for_ranges(
        self,
        instrument_key: str,
        ranges: list[tuple[str, str]],
        interval_value: int = 1,
        interval_unit: str = "minute",
    ) -> pd.DataFrame:
        """Load features across multiple disjoint time ranges (used by CPCV)."""
        parts = []
        for start, end in ranges:
            part = self.load_features(instrument_key, start, end, interval_value, interval_unit)
            parts.append(part)
        if not parts:
            return pd.DataFrame()
        return pd.concat(parts, ignore_index=True)

    def load_labels_for_ranges(
        self,
        instrument_key: str,
        ranges: list[tuple[str, str]],
    ) -> pd.DataFrame:
        """Load labels across multiple disjoint time ranges (used by CPCV)."""
        parts = []
        for start, end in ranges:
            part = self.load_labels(instrument_key, start, end)
            parts.append(part)
        if not parts:
            return pd.DataFrame()
        return pd.concat(parts, ignore_index=True)
