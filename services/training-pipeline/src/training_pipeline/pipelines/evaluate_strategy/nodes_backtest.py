"""
Nodes for VectorBT Strategy Simulation
"""

import logging
import pandas as pd
import numpy as np
import vectorbt as vbt
import mlflow
from typing import Dict, Any

logger = logging.getLogger(__name__)

def simulate_strategy(
    predictions: pd.DataFrame, 
    price_data: pd.DataFrame, 
    parameters: Dict[str, Any]
) -> vbt.Portfolio:
    """
    Simulates trades using VectorBT given a set of model predictions and raw OHLCV.
    """
    logger.info("Starting VectorBT Walk-Forward Backtesting Simulation...")
    
    eval_params = parameters.get("evaluation", {})
    initial_capital = eval_params.get("initial_capital", 100000)
    fees = eval_params.get("fees", 0.0005) # 5 bps
    slippage = eval_params.get("slippage", 0.0001) # 1 bps
    prob_threshold = eval_params.get("prob_threshold", 0.6)
    
    if predictions.empty or price_data.empty:
        logger.warning("Empty predictions or price data. Returning empty mock portfolio.")
        # Dummy structure for standard kedro runs if data isn't ready
        close = pd.Series([100, 101, 102], index=pd.date_range('2023-01-01', periods=3))
        entries = pd.Series([True, False, False], index=close.index)
        exits = pd.Series([False, False, True], index=close.index)
        return vbt.Portfolio.from_signals(close, entries, exits, init_cash=initial_capital)
        
    # Standardize indices (Assuming both have a datetime index)
    try:
        df = price_data.join(predictions, how='inner')
    except Exception as e:
        logger.error(f"Failed to join price data and predictions on index: {e}")
        raise e

    close_prices = df['close']
    probs = df['prediction_prob'] # Example column name output by MetaLearner or Tiers
    
    # Generate Long/Short signals
    # Very basic logic: Go Long if prob > 0.6, Short if prob < 0.4
    entries = probs > prob_threshold
    exits = probs < (1 - prob_threshold) # Close long
    
    short_entries = probs < (1 - prob_threshold)
    short_exits = probs > prob_threshold # Close short
    
    # Create Portfolio using vectorbt
    portfolio = vbt.Portfolio.from_signals(
        close=close_prices,
        entries=entries,
        exits=exits,
        short_entries=short_entries,
        short_exits=short_exits,
        init_cash=initial_capital,
        fees=fees,
        slippage=slippage,
        freq='1m' # Minute frequency
    )

    try:
        if mlflow.active_run():
            fig = portfolio.plot()
            if hasattr(fig, 'figure'):
                mlflow.log_figure(fig.figure, "equity_curve.png")
            elif hasattr(fig, 'savefig'):
                mlflow.log_figure(fig, "equity_curve.png")
    except Exception:
        pass
    
    logger.info(f"VectorBT simulation complete. Total Return: {portfolio.total_return():.2%}")
    return portfolio
