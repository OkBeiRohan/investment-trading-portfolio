import numpy as np
import pandas as pd


def calculate_sharpe_ratio(returns: pd.Series, risk_free_rate: float = 0.05) -> float:
    """Calculate annualized Sharpe ratio"""
    excess_returns = returns - risk_free_rate / 252
    return np.sqrt(252) * excess_returns.mean() / excess_returns.std()


def calculate_sortino_ratio(returns: pd.Series, risk_free_rate: float = 0.05) -> float:
    """Calculate Sortino ratio (downside deviation)"""
    excess_returns = returns - risk_free_rate / 252
    downside_returns = excess_returns[excess_returns < 0]
    downside_std = downside_returns.std()

    return np.sqrt(252) * excess_returns.mean() / downside_std


def calculate_max_drawdown(equity_curve: pd.Series) -> float:
    """Calculate maximum drawdown"""
    cumulative = (1 + equity_curve).cumprod()
    running_max = cumulative.cummax()
    drawdown = (cumulative - running_max) / running_max

    return drawdown.min()


def calculate_calmar_ratio(returns: pd.Series, max_drawdown: float) -> float:
    """Calculate Calmar ratio (return / max drawdown)"""
    annual_return = (1 + returns.mean()) ** 252 - 1
    return annual_return / abs(max_drawdown)
