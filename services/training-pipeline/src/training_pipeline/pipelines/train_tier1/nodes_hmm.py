"""
Nodes for Tier 1: Macro Director (Regime HMM)
"""

import logging
import pandas as pd
from typing import Dict, Any
from hmmlearn.hmm import GaussianHMM

logger = logging.getLogger(__name__)

def train_regime_hmm_model(
    train_data: pd.DataFrame, parameters: Dict[str, Any]
) -> GaussianHMM:
    """
    Trains a Gaussian Hidden Markov Model to classify 
    daily market regimes (e.g., Bull Volatile, Bear Ranging).
    """
    logger.info("Training Tier 1 Regime HMM Model...")
    
    tier1_params = parameters.get("tier1", {})
    hmm_params = tier1_params.get("hmm", {})
    features = tier1_params.get("features", [])
    
    n_components = hmm_params.get("n_components", 4)
    covariance_type = hmm_params.get("covariance_type", "full")
    n_iter = hmm_params.get("n_iter", 100)
    
    if train_data.empty:
        raise ValueError("Training data for HMM cannot be empty.")
        
    # Standardize data before HMM
    X_train = train_data[features].dropna()
    
    # Needs purely numerical array
    X_values = X_train.values
    
    model = GaussianHMM(
        n_components=n_components, 
        covariance_type=covariance_type, 
        n_iter=n_iter, 
        random_state=42
    )
    
    model.fit(X_values)
    
    logger.info(f"Tier 1 HMM Coverged: {model.monitor_.converged}")
    return model
