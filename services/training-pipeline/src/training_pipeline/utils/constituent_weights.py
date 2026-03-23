"""
Nifty 50 Constituent Weights Loader

Provides point-in-time constituent weights for the training pipeline.
Two data sources (tried in order):

1. **MongoDB** (primary): Monthly snapshots from HuggingFace dataset
   (AMP4010/Historical_Nifty_50_Constituent_Weights_20Y) stored in the
   MarketData.constituent_weight_snapshots collection.

2. **CSV fallback**: Reads directly from the downloaded HF CSV files
   at services/market-feeder/src/historical-data/hf-nifty50-weights/.

Usage::

    from training_pipeline.utils.constituent_weights import ConstituentWeightsLoader

    loader = ConstituentWeightsLoader()
    weights_df = loader.get_all_snapshots()  # Full history as DataFrame
    pit = loader.get_weights_at_date("2023-06-15")  # Point-in-time lookup
"""

import os
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

import pandas as pd

logger = logging.getLogger(__name__)

INDEX_NAME = "Nifty 50"
COLLECTION_NAME = "constituent_weight_snapshots"

DEFAULT_CSV_DIR = os.path.join(
    os.path.dirname(__file__),
    "..", "..", "..", "..", "..",
    "market-feeder", "src", "historical-data", "hf-nifty50-weights",
)


class ConstituentWeightsLoader:
    """
    Loads Nifty 50 constituent weight data for training.

    Parameters
    ----------
    mongodb_uri : str, optional
        MongoDB connection string. Defaults to MONGODB_URI env var.
    db_name : str, optional
        Database name. Defaults to "MarketData".
    csv_dir : str, optional
        Path to HF CSV directory for fallback loading.
    """

    def __init__(
        self,
        mongodb_uri: Optional[str] = None,
        db_name: str = "MarketData",
        csv_dir: Optional[str] = None,
    ):
        self._mongodb_uri = mongodb_uri or os.environ.get("MONGODB_URI", "")
        self._db_name = db_name
        self._csv_dir = Path(csv_dir or DEFAULT_CSV_DIR).resolve()
        self._client = None
        self._db = None

    def _get_collection(self):
        """Lazily connect to MongoDB and return the collection."""
        if self._client is None:
            try:
                from pymongo import MongoClient
                self._client = MongoClient(self._mongodb_uri)
                self._db = self._client[self._db_name]
            except Exception as e:
                logger.warning("Could not connect to MongoDB: %s", e)
                return None
        return self._db[COLLECTION_NAME] if self._db else None

    def get_all_snapshots(self) -> pd.DataFrame:
        """
        Load all weight snapshots as a wide-format DataFrame.

        Returns a DataFrame with columns: date, symbol_1, symbol_2, ..., symbol_N
        where each cell is the weight percentage (0 if not a constituent).
        """
        collection = self._get_collection()
        if collection is not None:
            try:
                count = collection.count_documents({"indexName": INDEX_NAME})
                if count > 0:
                    return self._load_from_mongodb(collection)
            except Exception as e:
                logger.warning("MongoDB load failed, falling back to CSV: %s", e)

        return self._load_from_csv()

    def get_all_snapshots_long(self) -> pd.DataFrame:
        """
        Load all weight snapshots in long format.

        Returns a DataFrame with columns: date, symbol, weight_pct, sector.
        One row per (date, symbol) pair where weight > 0.
        """
        collection = self._get_collection()
        if collection is not None:
            try:
                count = collection.count_documents({"indexName": INDEX_NAME})
                if count > 0:
                    return self._load_from_mongodb_long(collection)
            except Exception as e:
                logger.warning("MongoDB load failed, falling back to CSV: %s", e)

        return self._load_from_csv_long()

    def get_weights_at_date(self, date: str) -> dict[str, float]:
        """
        Point-in-time weight lookup.

        Parameters
        ----------
        date : str
            ISO date string (e.g. "2023-06-15").

        Returns
        -------
        dict
            Mapping of symbol → weight_pct for active constituents.
        """
        target = datetime.fromisoformat(date)

        collection = self._get_collection()
        if collection is not None:
            try:
                doc = collection.find_one(
                    {"indexName": INDEX_NAME, "date": {"$lte": target}},
                    sort=[("date", -1)],
                )
                if doc:
                    return {
                        c["symbol"]: c["weightPct"]
                        for c in doc.get("constituents", [])
                    }
            except Exception as e:
                logger.warning("MongoDB lookup failed, using CSV: %s", e)

        df = self._load_from_csv()
        df = df[df["DATE"] <= date]
        if df.empty:
            return {}

        row = df.iloc[-1]
        return {
            col: float(row[col])
            for col in df.columns
            if col != "DATE" and float(row[col]) > 0
        }

    def get_sectors(self) -> dict[str, str]:
        """Load the symbol → sector mapping from sectors.csv."""
        csv_path = self._csv_dir / "sectors.csv"
        if not csv_path.exists():
            logger.warning("sectors.csv not found at %s", csv_path)
            return {}

        df = pd.read_csv(csv_path)
        return dict(zip(df["STOCK"], df["SECTOR"]))

    def get_weight_for_features(
        self,
        timestamps: pd.Series,
        symbols: list[str],
    ) -> pd.DataFrame:
        """
        Build a weight matrix aligned to training timestamps.

        For each timestamp, looks up the most recent monthly weight snapshot
        and returns a DataFrame with the same index as timestamps and one
        column per symbol containing the weight percentage.

        Useful for enriching training features with point-in-time weights.
        """
        wide = self.get_all_snapshots()
        if wide.empty:
            return pd.DataFrame(0.0, index=timestamps.index, columns=symbols)

        wide["DATE"] = pd.to_datetime(wide["DATE"])
        wide = wide.set_index("DATE").sort_index()

        result = pd.DataFrame(index=timestamps.index, columns=symbols, dtype=float)
        ts_dates = pd.to_datetime(timestamps)

        for idx, ts in zip(timestamps.index, ts_dates):
            mask = wide.index <= ts
            if mask.any():
                row = wide.loc[mask].iloc[-1]
                for sym in symbols:
                    if sym in row.index:
                        result.at[idx, sym] = float(row[sym])
                    else:
                        result.at[idx, sym] = 0.0
            else:
                result.loc[idx] = 0.0

        return result.fillna(0.0)

    # ------------------------------------------------------------------
    # Private: MongoDB loading
    # ------------------------------------------------------------------

    def _load_from_mongodb(self, collection) -> pd.DataFrame:
        """Load snapshots from MongoDB and pivot to wide format."""
        cursor = collection.find(
            {"indexName": INDEX_NAME},
            {"date": 1, "constituents": 1, "_id": 0},
        ).sort("date", 1)

        rows = []
        for doc in cursor:
            row = {"DATE": doc["date"].strftime("%Y-%m-%d")}
            for c in doc.get("constituents", []):
                row[c["symbol"]] = c["weightPct"]
            rows.append(row)

        df = pd.DataFrame(rows).fillna(0.0)
        logger.info("Loaded %d weight snapshots from MongoDB", len(df))
        return df

    def _load_from_mongodb_long(self, collection) -> pd.DataFrame:
        """Load snapshots from MongoDB in long format."""
        cursor = collection.find(
            {"indexName": INDEX_NAME},
            {"date": 1, "constituents": 1, "_id": 0},
        ).sort("date", 1)

        records = []
        for doc in cursor:
            date_str = doc["date"].strftime("%Y-%m-%d")
            for c in doc.get("constituents", []):
                records.append({
                    "date": date_str,
                    "symbol": c["symbol"],
                    "weight_pct": c["weightPct"],
                    "sector": c.get("sector", ""),
                })

        df = pd.DataFrame(records)
        logger.info("Loaded %d weight records from MongoDB (long format)", len(df))
        return df

    # ------------------------------------------------------------------
    # Private: CSV fallback
    # ------------------------------------------------------------------

    def _load_from_csv(self) -> pd.DataFrame:
        """Load from the downloaded HF CSV files."""
        csv_path = self._csv_dir / "weights.csv"
        if not csv_path.exists():
            logger.error("weights.csv not found at %s", csv_path)
            return pd.DataFrame()

        df = pd.read_csv(csv_path)
        logger.info("Loaded %d weight snapshots from CSV", len(df))
        return df

    def _load_from_csv_long(self) -> pd.DataFrame:
        """Load CSV and melt to long format."""
        wide = self._load_from_csv()
        if wide.empty:
            return pd.DataFrame()

        sectors = self.get_sectors()
        long = wide.melt(id_vars=["DATE"], var_name="symbol", value_name="weight_pct")
        long = long[long["weight_pct"] > 0].copy()
        long.rename(columns={"DATE": "date"}, inplace=True)
        long["sector"] = long["symbol"].map(sectors).fillna("")
        return long.sort_values(["date", "symbol"]).reset_index(drop=True)
