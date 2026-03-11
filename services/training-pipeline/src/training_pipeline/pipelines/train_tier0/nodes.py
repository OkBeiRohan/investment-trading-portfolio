"""
Nodes for Tier 0: Pre-Market Gap Predictor (XGBoost)
"""

import logging
import pandas as pd
import xgboost as xgb
from typing import Dict, Any

logger = logging.getLogger(__name__)

def train_xgboost_gap_model(
    train_data: pd.DataFrame, parameters: Dict[str, Any]
) -> xgb.Booster:
    """
    Trains the XGBoost model to predict the pre-market gap magnitude 
    based on overnight global indices.
    """
    logger.info("Training Tier 0 XGBoost Gap Predictor...")
    
    # Extract params
    xgb_params = parameters.get("xgboost", {})
    features = parameters.get("features", [])
    target = parameters.get("target", "actualGapPct")
    
    X_train = train_data[features]
    y_train = train_data[target]
    
    dtrain = xgb.DMatrix(X_train, label=y_train)
    
    # Train
    num_boost_round = xgb_params.pop("num_boost_round", 100)
    model = xgb.train(
        params=xgb_params,
        dtrain=dtrain,
        num_boost_round=num_boost_round,
    )
    
    logger.info("Tier 0 model training complete.")
    return model


def evaluate_tier0_model(
    model: xgb.Booster, test_data: pd.DataFrame, parameters: Dict[str, Any]
) -> Dict[str, float]:
    """
    Evaluates the XGBoost Gap Predictor using MAE and RMSE.
    """
    from sklearn.metrics import mean_absolute_error, mean_squared_error
    import numpy as np
    
    features = parameters.get("features", [])
    target = parameters.get("target", "actualGapPct")
    
    X_test = test_data[features]
    y_test = test_data[target]
    
    dtest = xgb.DMatrix(X_test)
    predictions = model.predict(dtest)
    
    mae = mean_absolute_error(y_test, predictions)
    rmse = np.sqrt(mean_squared_error(y_test, predictions))
    
    metrics = {"mae": float(mae), "rmse": float(rmse)}
    logger.info(f"Tier 0 Evaluation Metrics: {metrics}")
    
    return metrics
