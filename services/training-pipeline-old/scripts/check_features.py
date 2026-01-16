"""
Check QuestDB Features for Training

Verifies that:
1. QuestDB is accessible
2. lightgbm_features table exists
3. Features are populated with data
4. Date range is sufficient for training
"""

import sys
from datetime import datetime, timedelta
from pathlib import Path
import psycopg2

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
        row_count = result.fetchone()[0]  # type: ignore
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
        min_date = row[0]  # type: ignore
        max_date = row[1]  # type: ignore

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
            # Market Structure (8)
            "price_vs_vwap",
            "price_vs_day_high",
            "price_vs_day_low",
            "range_position",
            "prev_day_high_dist",
            "prev_day_low_dist",
            "weekly_high_dist",
            "weekly_low_dist",
            # Momentum & Trend (8)
            "rsi_5",
            "rsi_14",
            "rsi_21",
            "macd_hist",
            "ema_9_slope",
            "ema_21_slope",
            "adx",
            "roc_5",
            # Volatility (5)
            "atr_percent",
            "realized_vol_5m",
            "realized_vol_15m",
            "vol_expansion_ratio",
            "india_vix",
            # Options (9)
            "atm_iv",
            "atm_iv_change",
            "delta_atm",
            "gamma_atm",
            "vega_atm",
            "theta_atm",
            "pcr_oi",
            "pcr_volume",
            "max_pain_dist",
            # Time Context (3)
            "minutes_from_open",
            "minutes_to_close",
            "day_of_week",
        ]

        print(f"  Total columns: {len(columns)}")
        print(f"  Expected: 33 features + timestamp = 34 columns")
        print()
        print("  Note: close_price will be JOINed from market_candles during training")
        print()

        # Check for missing features
        missing_features = []
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
        null_counts = []
        for feature in expected_features:
            if feature in columns:
                result = connection.execute(
                    text(
                        f"SELECT COUNT(*) FROM market_state_1m WHERE {feature} IS NULL"
                    )
                )
                null_count = result.fetchone()[0]  # type: ignore
                if null_count > 0:
                    null_counts.append((feature, null_count))

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
