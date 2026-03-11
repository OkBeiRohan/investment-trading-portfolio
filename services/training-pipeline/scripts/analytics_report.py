#!/usr/bin/env python3
"""
Portfolio Analytics & Tear Sheet Generation (Phase 9)

Connects to the MongoDB audit logs of live executions (Algo Worker Layer 6)
and computes standard financial metrics using `empyrical`.
"""

import sys
import logging
import pandas as pd
from pymongo import MongoClient

try:
    import empyrical as emp
except ImportError:
    print("empyrical not installed. Run: pip install empyrical-reloaded")
    sys.exit(1)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

MONGO_URI = "mongodb://localhost:27017" # Should be fed from .env in production
DB_NAME = "trading"
COLL_NAME = "trade_logs"

def fetch_trade_logs():
    """Fetches completed trades to compute daily returns."""
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
        db = client[DB_NAME]
        trades = list(db[COLL_NAME].find({"status": "FILLED"}))
        return pd.DataFrame(trades)
    except Exception as e:
        logger.warning(f"Could not connect to MongoDB or fetch trades: {e}")
        return pd.DataFrame()

def run_analytics():
    logger.info("Starting Portfolio Analytics Report...")
    
    df = fetch_trade_logs()
    
    if df.empty:
        logger.warning("No trade logs found. Generating mock analytics for report illustration.")
        dates = pd.date_range(end=pd.Timestamp.now(), periods=30, freq='D')
        returns = pd.Series([0.005, -0.002, 0.01, 0.001, -0.015, 0.02, 0.003, -0.001, 0.008, 0.002] * 3, index=dates)
    else:
        # Assuming df has 'filled_at' and 'realized_pnl_pct'
        df['date'] = pd.to_datetime(df['filled_at']).dt.date
        returns = df.groupby('date')['realized_pnl_pct'].sum()
        returns.index = pd.to_datetime(returns.index)

    # Compute Metrics
    annualized_return = emp.annual_return(returns)
    annualized_vol = emp.annual_volatility(returns)
    sharpe = emp.sharpe_ratio(returns)
    sortino = emp.sortino_ratio(returns)
    max_dd = emp.max_drawdown(returns)
    calmar = emp.calmar_ratio(returns)
    
    print("\n" + "="*40)
    print("📈 PORTFOLIO ANALYTICS TEAR SHEET 📈")
    print("="*40)
    print(f"Timeframe: {returns.index.min().date()} to {returns.index.max().date()}")
    print(f"Trading Days: {len(returns)}")
    print("-"*40)
    print(f"Annualized Return:  {annualized_return:8.2%}")
    print(f"Annualized Vol:     {annualized_vol:8.2%}")
    print(f"Max Drawdown:       {max_dd:8.2%}")
    print(f"Sharpe Ratio:       {sharpe:8.2f}")
    print(f"Sortino Ratio:      {sortino:8.2f}")
    print(f"Calmar Ratio:       {calmar:8.2f}")
    print("="*40 + "\n")

    # In production, this output would be saved to an HTML file or sent to a Slack channel
    logger.info("Analytics complete.")

if __name__ == "__main__":
    run_analytics()
