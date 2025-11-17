"""
Generate synthetic training data for model training
This creates realistic-looking features for testing the training pipeline
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta

np.random.seed(42)


def generate_sample_data(
    n_samples=5000, output_path="data/exports/features_labeled.csv"
):
    """
    Generate synthetic training data with realistic feature distributions

    Features include:
    - Underlying features (volatility, RSI, MACD)
    - Sentiment features (India VIX, PCR)
    - Options features (ATM IV, skew, term structure)
    - Time features
    """

    print(f"Generating {n_samples} samples of synthetic training data...")

    # Generate timestamps (every 5 minutes for 100 days)
    start_date = datetime(2024, 1, 1, 9, 15)  # Market open
    timestamps = []
    current_time = start_date

    for _ in range(n_samples):
        timestamps.append(current_time)
        current_time += timedelta(minutes=5)

        # Skip non-market hours (9:15 AM - 3:30 PM IST)
        if current_time.hour >= 15 and current_time.minute > 30:
            current_time = current_time.replace(hour=9, minute=15)
            current_time += timedelta(days=1)

    # Underlying features (with autocorrelation)
    realized_vol_5d = np.random.normal(15, 3, n_samples)
    realized_vol_10d = realized_vol_5d * 0.95 + np.random.normal(0, 1, n_samples)
    realized_vol_20d = realized_vol_10d * 0.98 + np.random.normal(0, 1, n_samples)

    rsi14 = np.random.beta(5, 5, n_samples) * 100  # RSI between 0-100

    macd = np.random.normal(0, 50, n_samples)
    macd_signal = macd * 0.9 + np.random.normal(0, 10, n_samples)
    macd_histogram = macd - macd_signal

    sma20 = 19000 + np.cumsum(np.random.normal(0, 50, n_samples))
    sma50 = sma20 * 0.98 + np.random.normal(0, 100, n_samples)

    ema12 = sma20 + np.random.normal(0, 50, n_samples)
    ema26 = sma20 - np.random.normal(0, 50, n_samples)

    # Sentiment features
    india_vix = np.random.gamma(4, 3, n_samples) + 10  # Typical range 10-40
    india_vix_ma5 = pd.Series(india_vix).rolling(5, min_periods=1).mean().values

    pcr_volume = np.random.lognormal(0, 0.3, n_samples)  # PCR typically 0.5-2.0
    pcr_oi = np.random.lognormal(0, 0.25, n_samples)

    max_pain = sma20 + np.random.normal(0, 200, n_samples)

    # Options features
    atm_iv = india_vix * 0.9 + np.random.normal(0, 2, n_samples)

    # Volatility skew (OTM Put IV - ATM Call IV)
    vol_skew = np.random.normal(2, 1, n_samples)

    # Term structure (IV 7day / IV 30day)
    term_structure = np.random.normal(0.95, 0.1, n_samples)

    call_iv_spread = np.random.normal(1, 0.5, n_samples)
    put_iv_spread = np.random.normal(1.2, 0.5, n_samples)

    # Time features
    hours = [ts.hour for ts in timestamps]
    day_of_week = [ts.weekday() for ts in timestamps]
    is_market_open = [
        1 if (9 <= h < 15) or (h == 15 and ts.minute <= 30) else 0
        for h, ts in zip(hours, timestamps)
    ]

    # Generate target (binary classification)
    # Target = 1 if volatility will increase in next 4 hours
    # Use a mix of features to create realistic patterns
    signal_strength = (
        0.3 * (realized_vol_5d - realized_vol_5d.mean()) / realized_vol_5d.std()
        + 0.2 * (india_vix - india_vix.mean()) / india_vix.std()
        + 0.2 * (pcr_volume - pcr_volume.mean()) / pcr_volume.std()
        + 0.15 * (vol_skew - vol_skew.mean()) / vol_skew.std()
        + 0.15 * np.random.normal(0, 1, n_samples)  # Add noise
    )

    # Convert to binary (with some class imbalance)
    target = (signal_strength > -0.2).astype(int)  # ~60% positive class

    # Create DataFrame
    df = pd.DataFrame(
        {
            "timestamp": timestamps,
            # Underlying features
            "realizedVol5d": realized_vol_5d,
            "realizedVol10d": realized_vol_10d,
            "realizedVol20d": realized_vol_20d,
            "rsi14": rsi14,
            "macd": macd,
            "macdSignal": macd_signal,
            "macdHistogram": macd_histogram,
            "sma20": sma20,
            "sma50": sma50,
            "ema12": ema12,
            "ema26": ema26,
            # Sentiment features
            "indiaVix": india_vix,
            "indiaVixMA5": india_vix_ma5,
            "pcrVolume": pcr_volume,
            "pcrOI": pcr_oi,
            "maxPain": max_pain,
            # Options features
            "atmIV": atm_iv,
            "volSkew": vol_skew,
            "termStructure": term_structure,
            "callIVSpread": call_iv_spread,
            "putIVSpread": put_iv_spread,
            # Time features
            "hour": hours,
            "dayOfWeek": day_of_week,
            "isMarketOpen": is_market_open,
            # Target
            "target": target,
        }
    )

    # Save to CSV
    df.to_csv(output_path, index=False)

    print(f"✓ Generated {len(df)} samples")
    print(f"✓ Features: {len(df.columns) - 2}")  # Exclude timestamp and target
    print(
        f"✓ Target distribution: {target.sum()} positive ({target.mean()*100:.1f}%), {len(target) - target.sum()} negative"
    )
    print(f"✓ Saved to {output_path}")

    return df


if __name__ == "__main__":
    df = generate_sample_data(n_samples=5000)

    # Print sample statistics
    print("\nSample Statistics:")
    print(df.describe())
