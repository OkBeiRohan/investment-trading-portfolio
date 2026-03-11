"""
Nodes for Implied Volatility Surface smoothing (Phase 9)
"""

import logging
import pandas as pd
import numpy as np
from sklearn.preprocessing import PolynomialFeatures
from sklearn.linear_model import Ridge
from typing import Dict, Any

logger = logging.getLogger(__name__)

def predict_iv_surface(option_chain: pd.DataFrame, parameters: Dict[str, Any]) -> pd.DataFrame:
    """
    Fits a 2D Polynomial surface to raw implied volatilities fetched from Upstox.
    Outputs a standard smoothed IV grid to detect pricing anomalies across Strikes and Expiries.
    """
    logger.info("Fitting Implied Volatility Surface using 2D Polynomial Ridge Regression...")
    
    iv_params = parameters.get("iv_surface", {})
    degree = iv_params.get("polynomial_degree", 3)
    alpha = iv_params.get("ridge_alpha", 0.1)
    
    if option_chain.empty:
        logger.warning("Empty option chain provided. Returning dummy IV surface.")
        # Return a mock dataframe for Kedro pipeline continuity
        return pd.DataFrame({
            'strike': [19000, 19100, 19200],
            'dte': [7, 7, 7],
            'smoothed_iv': [0.15, 0.14, 0.13]
        })
        
    try:
        # Requires 'strike', 'dte' (days to expiry), and 'raw_iv' columns
        # Drop illiquid contracts where IV is 0 or NaN
        clean_chain = option_chain.dropna(subset=['raw_iv']).copy()
        clean_chain = clean_chain[clean_chain['raw_iv'] > 0.01].copy()
        
        # Calculate Moneyness (Strike / Underlying Price)
        # Assumes underlying price is attached to the chain rows
        if 'underlying_price' in clean_chain.columns:
            clean_chain['moneyness'] = clean_chain['strike'] / clean_chain['underlying_price']
        else:
            # Fallback if underlying price is missing
            clean_chain['moneyness'] = clean_chain['strike']
            
        X = clean_chain[['moneyness', 'dte']].values
        y = clean_chain['raw_iv'].values
        
        # Scale DTE to be comparable to moneyness (e.g., convert to years)
        X[:, 1] = X[:, 1] / 365.0
        
        poly = PolynomialFeatures(degree=degree, include_bias=False)
        X_poly = poly.fit_transform(X)
        
        model = Ridge(alpha=alpha)
        model.fit(X_poly, y)
        
        # Predict on a standard grid for the "Surface" output
        moneyness_grid = np.linspace(0.8, 1.2, 50)
        dte_grid = np.array([1, 7, 14, 30, 60, 90]) / 365.0
        
        m_mesh, d_mesh = np.meshgrid(moneyness_grid, dte_grid)
        grid_points = np.column_stack([m_mesh.ravel(), d_mesh.ravel()])
        grid_poly = poly.transform(grid_points)
        
        smoothed_iv = model.predict(grid_poly)
        
        surface_df = pd.DataFrame({
            'moneyness': grid_points[:, 0],
            'dte_years': grid_points[:, 1],
            'smoothed_iv': smoothed_iv
        })
        
        # Prevent negative IVs from polynomial extrapolation
        surface_df['smoothed_iv'] = surface_df['smoothed_iv'].clip(lower=0.01)
        
        logger.info(f"Fitted IV Surface over {len(clean_chain)} valid options contracts.")
        return surface_df
        
    except Exception as e:
        logger.error(f"Failed to fit IV Surface: {e}", exc_info=True)
        return pd.DataFrame(columns=['strike', 'dte', 'smoothed_iv'])
