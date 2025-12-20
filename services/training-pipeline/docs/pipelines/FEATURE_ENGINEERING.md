# Feature Engineering Pipeline

Compute 50+ features from OHLCV candles for ML training.

---

## Purpose

Transform raw candle data into engineered features: technical indicators, volatility metrics, options-specific features, and microstructure signals.

---

## Nodes

### **1. compute_technical_indicators**

**Function**: `compute_technical_features(candles)`

**Features** (20):

- RSI (14-period)
- MACD (12, 26, 9)
- Bollinger Bands (20-period, 2 std dev)
- SMA (20, 50)
- EMA (12, 26)
- ATR (14-period)
- OBV (On-Balance Volume)
- ADX (14-period)
- CCI (20-period)
- MFI (14-period)
- Stochastic Oscillator (14, 3)
- Williams %R (14-period)
- ROC (Rate of Change, 12-period)
- TRIX (Triple EMA Oscillator)

**Example**:

```python
def compute_rsi(df, period=14):
    delta = df['close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi
```

---

### **2. compute_volatility_metrics**

**Function**: `compute_volatility_features(candles)`

**Features** (10):

- Realized Volatility (5d, 10d, 20d)
- Parkinson Volatility
- Garman-Klass Volatility
- Yang-Zhang Volatility
- India VIX (fetch from market-feeder)
- VIX Futures (1M, 2M, 3M)

**Example**:

```python
def compute_realized_vol(df, window=20):
    log_returns = np.log(df['close'] / df['close'].shift(1))
    vol = log_returns.rolling(window=window).std() * np.sqrt(252)
    return vol
```

---

### **3. compute_options_features**

**Function**: `compute_options_features(candles, option_chain)`

**Features** (15):

- ATM Implied Volatility (call, put, average)
- IV Skew (25-delta, 10-delta)
- IV Term Structure (1W, 1M, 3M)
- Put-Call Ratio (volume, OI)
- Max Pain
- OI Buildup
- Greeks (delta, gamma, vega)

**Example**:

```python
def compute_max_pain(option_chain, spot_price):
    strikes = option_chain['strike'].unique()
    min_pain = float('inf')
    max_pain_strike = None

    for strike in strikes:
        call_loss = ((spot_price - strike).clip(lower=0) * option_chain[option_chain['strike'] == strike]['call_oi']).sum()
        put_loss = ((strike - spot_price).clip(lower=0) * option_chain[option_chain['strike'] == strike]['put_oi']).sum()
        total_loss = call_loss + put_loss

        if total_loss < min_pain:
            min_pain = total_loss
            max_pain_strike = strike

    return max_pain_strike
```

---

### **4. compute_microstructure_features**

**Function**: `compute_microstructure_features(tick_data)`

**Features** (5):

- Bid-Ask Spread
- Order Book Imbalance
- Trade Intensity (trades per minute)
- Volume Profile
- Tick Direction (uptick/downtick ratio)

---

## Feature Vector Size

**Total**: 50 features (Float32Array)

---

## Parameters

**File**: `conf/base/parameters/feature_engineering.yml`

```yaml
feature_engineering:
  technical:
    rsi_period: 14
    macd_fast: 12
    macd_slow: 26
    macd_signal: 9
    bb_period: 20
    bb_stddev: 2
  volatility:
    realized_vol_windows: [5, 10, 20] # days
  options:
    iv_skew_deltas: [0.25, 0.10]
    iv_term_periods: ["1W", "1M", "3M"]
```

---

## Run

```bash
kedro run --pipeline feature_engineering
```

---

## Output

**File**: `data/04_feature/features.parquet`

**Schema**:

```python
{
    'timestamp': datetime64[ns],
    'symbol': str,
    'rsi_14': float32,
    'macd': float32,
    # ... (48 more features)
}
```

---

## Testing

**Unit Tests**:

```python
def test_compute_rsi():
    df = pd.DataFrame({'close': [100, 102, 101, 103, 105, 104, 106]})
    rsi = compute_rsi(df, period=3)
    assert 0 <= rsi.iloc[-1] <= 100
```
