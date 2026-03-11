"""
Kedro pipeline for 'evaluate_strategy'

Backtesting and Metric Calculations using VectorBT and Empyrical
"""

from kedro.pipeline import Pipeline, node
from .nodes_backtest import simulate_strategy
from .nodes_metrics import calculate_metrics

def create_pipeline(**kwargs) -> Pipeline:
    return Pipeline(
        [
            node(
                func=simulate_strategy,
                inputs={"predictions": "tier2_oof_predictions", "price_data": "raw_market_prices", "parameters": "params:evaluation"},
                outputs="portfolio_simulation_results",
                name="simulate_strategy_vectorbt",
            ),
            node(
                func=calculate_metrics,
                inputs={"portfolio": "portfolio_simulation_results", "parameters": "params:evaluation"},
                outputs="strategy_metrics_report",
                name="calculate_strategy_metrics",
            ),
        ],
        namespace="evaluate_strategy",
        tags=["evaluate", "backtest"],
    )
