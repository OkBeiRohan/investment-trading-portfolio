"""
Check QuestDB Features for Training

Verifies that:
1. QuestDB is accessible
2. lightgbm_features table exists
3. Features are populated with data
4. Date range is sufficient for training
"""

import sys
from pathlib import Path

# Add src to path
src_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_path))

from sqlalchemy import create_engine, text


def main():
    print("=" * 80)
    print("QuestDB Feature Verification")
    print("=" * 80)
    print()

    connection_string = "postgresql://admin:quest@localhost:8812/qdb"

    try:
        # Step 1: Connect to QuestDB
        print("Step 1: Connecting to QuestDB...")
        engine = create_engine(connection_string)
        connection = engine.connect()
        print("  ✅ Connected successfully")
        print()

        # Step 2: Check if table exists
        print("Step 2: Checking market_state_1m table...")
        result = connection.execute(
            text("SELECT COUNT(*) as count FROM market_state_1m")
        )
        row = result.fetchone()
        row_count = row[0] if row else 0
        print(f"  ✅ Table exists with {row_count:,} rows")
        print()

        if row_count == 0:
            print("  ⚠️  WARNING: Table is empty!")
            print("     You need to run compute-engine to populate features.")
            print()
            connection.close()
            return

        # Step 3: Check date range
        print("Step 3: Checking date range...")
        result = connection.execute(
            text(
                "SELECT MIN(timestamp) as min_date, MAX(timestamp) as max_date "
                "FROM market_state_1m"
            )
        )
        row = result.fetchone()
        min_date = row[0] if row else None
        max_date = row[1] if row else None

        print(f"  - First data: {min_date}")
        print(f"  - Last data:  {max_date}")

        # Calculate days
        if min_date and max_date:
            days = (max_date - min_date).days
            print(f"  - Total span: {days} days")
            print()

            if days < 365:
                print("  ⚠️  WARNING: Less than 1 year of data")
                print("     Recommended: 2+ years for robust training")
            elif days < 730:
                print("  ⚠️  Note: Less than 2 years of data")
                print("     Training will use all available data")
            else:
                print("  ✅ Sufficient data for 2-year training window")
            print()

        # Step 4: Check feature columns
        print("Step 4: Checking feature columns...")
        result = connection.execute(text("SELECT * FROM market_state_1m LIMIT 1"))
        columns = list(result.keys())

        expected_features = [
            # Index Breadth (6 features)
            # Compressed from 50 NIFTY constituents → participation metrics
            "pct_stocks_above_vwap",  # 0.0-1.0 (e.g., 0.72 = 36/50 bullish)
            "pct_stocks_above_ema20",  # 0.0-1.0 (trending confirmation)
            "weighted_return_top10",  # % return of top 10 weighted stocks
            "advance_decline_ratio",  # e.g., 1.8 (36 up, 14 down)
            "breadth_momentum_5m",  # 5-min momentum breadth
            "breadth_volatility",  # Intra-constituent volatility spread
            # NIFTY FUTURE (9 features) - +2 from original
            # Primary price discovery instrument (NOT spot - spot has no volume)
            "fut_price_vs_vwap",  # Normalized distance from VWAP
            "fut_range_position",  # 0.0-1.0 (where in daily range?)
            "fut_return_1m",  # 1-min return (momentum)
            "fut_return_5m",  # 5-min return (trend)
            "fut_atr_percent",  # ATR as % of price (volatility)
            "fut_volume_zscore",  # Volume z-score (participation)
            "fut_oi_change",  # OI change (positioning)
            "fut_rsi_14",  # RSI(14) - momentum oscillator
            "fut_macd",  # MACD - trend following
            # Options Aggregate State (11 features) - +2 from original
            # ATM only + market-wide aggregates (NOT per-strike)
            "atm_iv",  # ATM implied volatility
            "atm_iv_change",  # ΔIV (vol expansion/contraction)
            "iv_skew",  # OTM put IV - OTM call IV
            "gamma_atm",  # ATM gamma (curvature)
            "vega_atm",  # ATM vega (vol sensitivity)
            "theta_atm",  # ATM theta (time decay)
            "pcr_oi",  # Put-call ratio (open interest)
            "pcr_volume",  # Put-call ratio (volume)
            "max_pain_distance",  # Distance to max pain (dealer positioning)
            "charm_atm",  # ATM charm (delta decay) - added
            "vanna_atm",  # ATM vanna (delta-vol correlation) - added
            # Volatility & Regime Context (4 features)
            "india_vix",  # Market-wide fear gauge
            "realized_vol_5m",  # Short-term realized volatility
            "realized_vol_15m",  # Medium-term realized volatility
            "vol_expansion_ratio",  # Realized vol / historical avg
            # Time Context (3 features)
            "minutes_from_open",  # 0-375 (9:15 AM - 3:30 PM)
            "minutes_to_close",  # 375-0
            "day_of_week",  # 0-4 (Monday-Friday)
        ]

        print(f"  Total columns: {len(columns)}")
        print(f"  Expected: 33 features + timestamp = 34 columns")
        print()
        print("  Note: close_price will be JOINed from market_candles during training")
        print()

        # Check for missing features
        missing_features: list[str] = []
        for feature in expected_features:
            if feature not in columns:
                missing_features.append(feature)

        if missing_features:
            print(f"  ⚠️  Missing features ({len(missing_features)}):")
            for feat in missing_features:
                print(f"     - {feat}")
            print()
        else:
            print("  ✅ All 33 expected features present")
            print()

        # Step 5: Check for NULL values
        print("Step 5: Checking for NULL values...")
        null_counts: list[tuple[str, int]] = []
        for feature in expected_features:
            if feature in columns:
                result = connection.execute(
                    text(
                        f"SELECT COUNT(*) FROM market_state_1m WHERE {feature} IS NULL"
                    )
                )
                null_count: int = result.fetchone()[0]  # type: ignore
                if null_count > 0:
                    null_counts.append((feature, null_count)) # type: ignore

        if null_counts:
            print(f"  ⚠️  Features with NULL values:")
            for feature, count in sorted(null_counts, key=lambda x: x[1], reverse=True)[
                :10
            ]:
                pct = (count / row_count) * 100
                print(f"     - {feature:30s}: {count:8,} ({pct:5.2f}%)")
            print()
            print("  Note: NULL values will be handled during training")
        else:
            print("  ✅ No NULL values found")
        print()

        # Step 6: Sample data
        print("Step 6: Sample data (latest row)...")
        result = connection.execute(
            text("SELECT * FROM market_state_1m ORDER BY timestamp DESC LIMIT 1")
        )
        row = result.fetchone()
        if row:
            print(f"  Sample timestamp: {row[0]}")  # type: ignore
            if "atm_iv" in columns:
                print(f"  Sample atm_iv: {row[columns.index('atm_iv')]}")  # type: ignore
            if "rsi_14" in columns:
                print(f"  Sample rsi_14: {row[columns.index('rsi_14')]}")  # type: ignore
        print()

        # Summary
        print("=" * 80)
        print("Summary")
        print("=" * 80)

        if row_count > 0 and not missing_features:
            print("✅ Ready to train!")
            print()
            print("Run training with:")
            print("  cd services/training-pipeline")
            print("  poetry shell")
            print("  python scripts/train_lightgbm.py")
        else:
            print("⚠️  Not ready for training")
            print()
            if row_count == 0:
                print("Action required: Populate features using compute-engine")
            if missing_features:
                print("Action required: Ensure all features are computed")

        print("=" * 80)

        connection.close()

    except Exception as e:
        print(f"❌ Error: {e}")
        print()
        print("Common issues:")
        print("  1. QuestDB not running - run: pnpm run db:start")
        print("  2. Wrong credentials - check connection string")
        print("  3. Table not created - run compute-engine first")
        sys.exit(1)


if __name__ == "__main__":
    main()
