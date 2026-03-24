"""
Nodes for Metrics Extraction (Phase 6)
"""

import logging
import pandas as pd
import vectorbt as vbt
import mlflow
from typing import Dict, Any

logger = logging.getLogger(__name__)

def calculate_metrics(portfolio: vbt.Portfolio, parameters: Dict[str, Any]) -> Dict[str, float]:
    """
    Extracts core financial metrics from a VectorBT Portfolio object.
    Uses empyrical under the hood via VectorBT's stats module.
    """
    logger.info("Computing Quantitative Strategy Metrics...")
    
    try:
        # VectorBT's built-in stats calculation
        stats = portfolio.stats()
        
        # We extract specifically what we need for Kedro Telemetry / MLflow logging
        total_return = stats.get('Total Return [%]', 0.0)
        annualized_return = stats.get('Ann. Return [%]', 0.0)
        max_drawdown = stats.get('Max Drawdown [%]', 0.0)
        sharpe_ratio = stats.get('Sharpe Ratio', 0.0)
        sortino_ratio = stats.get('Sortino Ratio', 0.0)
        win_rate = stats.get('Win Rate [%]', 0.0)
        
        metrics = {
            "Total_Return_Pct": float(total_return),
            "Annualized_Return_Pct": float(annualized_return),
            "Max_Drawdown_Pct": float(max_drawdown),
            "Sharpe_Ratio": float(sharpe_ratio),
            "Sortino_Ratio": float(sortino_ratio),
            "Win_Rate_Pct": float(win_rate),
        }

        try:
            if mlflow.active_run():
                mlflow.log_metrics({
                    "backtest_total_return": metrics["Total_Return_Pct"],
                    "backtest_annualized_return": metrics["Annualized_Return_Pct"],
                    "backtest_max_drawdown": metrics["Max_Drawdown_Pct"],
                    "backtest_sharpe_ratio": metrics["Sharpe_Ratio"],
                    "backtest_sortino_ratio": metrics["Sortino_Ratio"],
                    "backtest_win_rate": metrics["Win_Rate_Pct"],
                })
        except Exception:
            pass
        
        logger.info(f"Walk-Forward PnL Metrics: {metrics}")
        
        # Optionally, plot tear sheet if desired in interactive runs
        # portfolio.plot().show()
        
        return metrics
    except Exception as e:
        logger.error(f"Failed to calculate valid metrics from portfolio: {e}")
        return {
            "Total_Return_Pct": 0.0,
            "Sharpe_Ratio": 0.0,
            "Max_Drawdown_Pct": 0.0,
            "Win_Rate_Pct": 0.0
        }
