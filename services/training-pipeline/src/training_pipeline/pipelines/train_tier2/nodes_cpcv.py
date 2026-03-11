"""
Nodes for Tier 2: Intraday Navigator (LightGBM with CPCV)
"""

import logging
import pandas as pd
import lightgbm as lgb
import psycopg2
from typing import Dict, Any, List
from kedro.io import DataCatalog
import os

logger = logging.getLogger(__name__)

def fetch_cpcv_folds(db_uri: str, dataset_name: str) -> pd.DataFrame:
    """Fetch fold definitions from QuestDB"""
    query = f"""
        SELECT fold_id, split_type, range_start, range_end
        FROM dataset_folds
        WHERE dataset_name = '{dataset_name}'
        ORDER BY fold_id, range_start
    """
    logger.info(f"Fetching CPCV folds for {dataset_name} from QuestDB...")
    with psycopg2.connect(db_uri) as conn:
        df = pd.read_sql(query, conn)
    return df

def load_data_for_ranges(db_uri: str, ranges_df: pd.DataFrame, instrument_key: str, features: List[str], target: str) -> pd.DataFrame:
    """Dynamically load ALL blocks of data matching the timestamp ranges"""
    
    if ranges_df.empty:
        return pd.DataFrame()
        
    # Build OR constraints for the ranges
    range_conditions = []
    for _, row in ranges_df.iterrows():
        start_ts = row['range_start'].isoformat()
        end_ts = row['range_end'].isoformat()
        range_conditions.append(f"(f.timestamp >= '{start_ts}' AND f.timestamp <= '{end_ts}')")
    
    range_sql = " OR ".join(range_conditions)
    feature_cols = ", ".join([f"f.{col}" for col in features])
    
    query = f"""
        SELECT f.timestamp, f.instrumentKey, {feature_cols}, l.{target} as target
        FROM instrument_features f
        JOIN training_labels l ON f.timestamp = l.timestamp AND f.instrumentKey = l.instrumentKey
        WHERE f.instrumentKey = '{instrumentKey}'
        AND ({range_sql})
        ORDER BY f.timestamp ASC
    """
    
    with psycopg2.connect(db_uri) as conn:
        df = pd.read_sql(query, conn)
        
    return df

def train_lightgbm_cpcv(
    catalog: DataCatalog, parameters: Dict[str, Any]
) -> Dict[str, lgb.Booster]:
    """
    Trains multiple LightGBM models using Combinatorial Purged Cross-Validation
    by querying the 'dataset_folds' table directly from QuestDB.
    """
    tier2_params = parameters.get("tier2", {})
    lgb_params = tier2_params.get("lightgbm", parameters.get("lightgbm", {}))
    
    dataset_name = tier2_params.get("dataset_name", "nifty50_1m_lightgbm")
    instrument_key = tier2_params.get("instrument_key", "NSE_INDEX|Nifty 50")
    features = parameters.get("features", {}).get("feature_columns", [])
    target = parameters.get("features", {}).get("target_column", "target_direction")
    
    # Normally use kedro credentials, using env vars here for simplicity
    db_host = os.environ.get("DB_HOST", "localhost")
    db_port = os.environ.get("DB_PG_PORT", "8812")
    db_user = os.environ.get("DB_USER", "admin")
    db_password = os.environ.get("DB_PASSWORD", "quest")
    db_uri = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/qdb"

    # 1. Fetch all folds
    try:
        folds_df = fetch_cpcv_folds(db_uri, dataset_name)
    except Exception as e:
        logger.error(f"Failed to fetch CPCV folds from QuestDB: {e}")
        raise

    if folds_df.empty:
        raise ValueError(f"No CPCV folds found in QuestDB for dataset: {dataset_name}")

    unique_folds = sorted(folds_df['fold_id'].unique())
    logger.info(f"Found {len(unique_folds)} CPCV folds: {unique_folds}")
    
    trained_models = {}
    
    # 2. Iterate each fold
    for fold in unique_folds:
        logger.info(f"=== Starting Fold {fold} ===")
        
        train_ranges = folds_df[(folds_df['fold_id'] == fold) & (folds_df['split_type'] == 'TRAIN')]
        test_ranges = folds_df[(folds_df['fold_id'] == fold) & (folds_df['split_type'] == 'TEST')]
        
        logger.info(f"Loading {len(train_ranges)} Train blocks and {len(test_ranges)} Test blocks...")
        
        train_data = load_data_for_ranges(db_uri, train_ranges, instrument_key, features, target)
        test_data = load_data_for_ranges(db_uri, test_ranges, instrument_key, features, target)
        
        logger.info(f"Fold {fold} | Train size: {len(train_data)} | Test size: {len(test_data)}")
        
        # Prepare Data
        X_train = train_data[features]
        y_train = train_data['target']
        X_test = test_data[features]
        y_test = test_data['target']
        
        dtrain = lgb.Dataset(X_train, label=y_train)
        dtest = lgb.Dataset(X_test, label=y_test, reference=dtrain)
        
        # Train
        model = lgb.train(
            lgb_params,
            dtrain,
            num_boost_round=lgb_params.get("num_boost_round", 500),
            valid_sets=[dtrain, dtest],
            valid_names=['train', 'eval'],
            callbacks=[
                lgb.early_stopping(stopping_rounds=lgb_params.get("early_stopping_rounds", 20)),
                lgb.log_evaluation(period=50)
            ],
        )
        
        trained_models[f"fold_{fold}"] = model
        
        # Clear memory per fold
        del train_data, test_data, X_train, y_train, X_test, y_test, dtrain, dtest
        
    return trained_models
