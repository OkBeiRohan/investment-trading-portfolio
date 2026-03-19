# TIER 0: Pre-Market Opening Calibrator

> **Calibrates the expected opening price, volatility, and directional bias by combining global overnight signals with the 9:08 AM pre-open freeze price. Since the freeze price already captures ~90% of the overnight gap via the pre-open call auction, this model primarily predicts the freeze-to-open residual and opening volatility regime.**

**Last Updated**: March 13, 2026
**Tier**: 0 — Pre-Market Intelligence
**Runs**: Once at 09:08:05 IST (after NIFTY pre-open freeze)

---

## Why This Tier Exists

The Indian equity market (NSE) is closed from 15:30 IST to 09:15 IST the next day — roughly 17.75 hours. During this window:

- US markets trade their full session (19:00–01:30 IST)
- Asian markets open (05:30 IST: Nikkei, Hang Seng, SGX Nifty)
- GIFT Nifty futures trade almost 24 hours (08:00–next 05:00 IST)
- Global commodities, currencies, and bond yields move continuously
- News events (Fed decisions, geopolitical events, earnings) break overnight

The **gap** between yesterday's 15:30 close and today's 09:15 open is a massive **price discontinuity** that purely intraday models (Tier 2/3) cannot handle. Tier 0 exists specifically to bridge this information gap.

---

## Trading Session Timeline (Tier 0 Context)

```
00:00 ───── 05:30 ───── 08:00 ─── 09:00 ───── 09:08 ──── 09:15 ───── 15:30
  │           │           │          │          │          │          │
  │  US close │ Asia open │ GIFT     │ Pre-open │ FREEZE   │ MARKET   │ MARKET
  │  (01:30)  │           │ Nifty    │ session  │ PRICE    │ OPENS    │ CLOSES
  │           │           │ active   │ starts   │          │          │
  └────────── OVERNIGHT DATA COLLECTION ────────┘          │          │
                                                │          │          │
                              TIER 0 FIRES ─────┘          │          │
                              (09:08:05)                   │          │
                                                           │          │
                              GAP REALIZED ────────────────┘          │
```

### Pre-Open Session Detail (09:00 – 09:15)

| Time Window         | What Happens                                              | Tier 0 Relevance                   |
| ------------------- | --------------------------------------------------------- | ---------------------------------- |
| 09:00 – 09:08       | Orders placed, modified, cancelled in pre-open book       | Not used (unstable, manipulable)   |
| 09:08:00            | **Pre-open freeze** — no more orders accepted             | **Trigger point for Tier 0**       |
| 09:08:00 – 09:14:59 | Match engine calculates equilibrium price                 | We use the frozen indicative price |
| 09:14:55            | Tier 0 fires final prediction + overnight candle snapshot | Consolidation for Tier 1/2         |
| 09:15:00            | Continuous trading begins, gap is realized                | Tier 0 output consumed downstream  |

---

### What This Model Actually Predicts

The pre-open call auction at 09:08 is itself a price-discovery mechanism — the freeze price is the auction equilibrium incorporating overnight information from all market participants. By including `actual_gap_points` and `actual_gap_pct` (freeze price vs prev close) as input features, **this model is NOT predicting the overnight gap from scratch**. Instead, it:

1. **Calibrates the freeze-to-open residual**: How much will the actual 09:15 opening price deviate from the 09:08 freeze price? (typically 0.05-0.15%)
2. **Classifies opening volatility**: Will the first 15 minutes be LOW/MEDIUM/HIGH volatility?
3. **Estimates directional bias**: Conditional on the freeze price, what is the likely direction in the first hour?

The model adds value by incorporating global overnight signals (US futures, MCX, sentiment) that retail participants in the pre-open session may not have fully priced in, plus historical patterns of freeze-to-open deviations.

---

## Architecture

### Model: XGBoost Gradient Boosting

| Property          | Value                                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| **Algorithm**     | XGBoost (gradient boosted trees)                                                                         |
| **Why XGBoost**   | Fast inference (~5ms), interpretable (SHAP), robust with tabular features, handles missing data natively |
| **Input**         | **24 features** — global overnight (12) + MCX commodities (8) + pre-market context (4)                   |
| **Output**        | `expected_gap_pct`, `expected_volatility`, `opening_bias`, `confidence`                                  |
| **Training Data** | 4+ years of pre-open snapshots + realized gaps                                                           |
| **Validation**    | Combinatorial Purged Cross-Validation (CPCV) with strict purging and embargoing                          |
| **Export**        | ONNX with FP16 quantization                                                                              |

### Why Not Deep Learning?

- Only 24 features — trees dominate at this scale
- Only ~1000 training samples/year (one per trading day)
- Need interpretability for SEBI audit compliance (SHAP values)
- <5ms inference required, XGBoost delivers ~2ms

---

## Input Features (24)

All features captured at **09:08:05 IST** after the pre-open freeze.

### Group A: Global Overnight Markets (12)

| #   | Feature                    | Source            | Description                                                           | Example   |
| --- | -------------------------- | ----------------- | --------------------------------------------------------------------- | --------- |
| 1   | `gift_nifty_premium`       | GIFT Nifty LTP    | GIFT Nifty LTP minus previous NIFTY close                             | +45.2 pts |
| 2   | `sp500_overnight_return`   | Yahoo Finance     | S&P 500 E-mini futures overnight % change                             | -0.35%    |
| 3   | `nasdaq_overnight_return`  | Yahoo Finance     | Nasdaq 100 E-mini futures overnight % change                          | -0.52%    |
| 4   | `nikkei_return`            | Yahoo Finance     | Nikkei 225 morning session return (to 09:08 IST)                      | +0.80%    |
| 5   | `brent_crude_change`       | Yahoo Finance     | Brent crude overnight % change                                        | +1.2%     |
| 6   | `brent_wti_spread`         | Yahoo Finance     | Brent − WTI price spread (contango/backwardation signal)              | $3.50     |
| 7   | `gold_change`              | Yahoo Finance     | Gold (XAU/USD) overnight % change                                     | -0.15%    |
| 8   | `usd_inr_change`           | Yahoo Finance     | USD/INR overnight % change (INR depreciation = negative for equities) | +0.08%    |
| 9   | `overnight_news_sentiment` | Finnhub + FinBERT | Aggregated sentiment score for India-relevant news [-1, +1]           | 0.25      |
| 10  | `actual_gap_points`        | Upstox Pre-Open   | 09:08 freeze indicative price − previous day close                    | +52.3 pts |
| 11  | `prev_day_range`           | QuestDB           | Previous day's (high − low) / close — recent volatility proxy         | 1.2%      |
| 12  | `prev_day_close_vs_vwap`   | QuestDB           | Previous close relative to VWAP — mean-reversion signal               | +0.15%    |

### Group B: MCX Commodity Snapshot (8) — **NEW**

MCX instruments streamed via Upstox WebSocket (`MCX_FO|*`). Forward-filled from last session close if MCX is closed at 09:08 IST. Values are **overnight % change** from previous MCX session close.

| #   | Feature                     | Upstox Instrument | Description                                  | Example                                                  |
| --- | --------------------------- | ----------------- | -------------------------------------------- | -------------------------------------------------------- |
| 13  | `mcx_crudeoil_change`       | `MCX_FO           | CRUDEOIL{expiry}FUT`                         | Crude Oil MCX overnight % change (INR-priced)            |
| 14  | `mcx_naturalgas_change`     | `MCX_FO           | NATURALGAS{expiry}FUT`                       | Natural Gas MCX overnight % change                       |
| 15  | `mcx_gold_change`           | `MCX_FO           | GOLD{expiry}FUT`                             | Gold MCX overnight % change (INR-denominated safe haven) |
| 16  | `mcx_silver_change`         | `MCX_FO           | SILVER{expiry}FUT`                           | Silver MCX overnight % change                            |
| 17  | `mcx_copper_change`         | `MCX_FO           | COPPER{expiry}FUT`                           | Copper MCX overnight % change (global growth proxy)      |
| 18  | `brent_mcx_crudeoil_spread` | derived           | Brent (USD) minus MCX Crude (INR-adj) spread | +125 INR                                                 |
| 19  | `mcx_commodity_breadth`     | derived           | Count(MCX instruments up overnight) / 5      | 0.6                                                      |
| 20  | `mcx_intraday_regime`       | derived           | Rolling z-score of all MCX overnight moves   | 1.2                                                      |

**Why MCX over NYMEX/ICE?** MCX prices are INR-denominated and reflect India's import duties, domestic demand, and USD/INR — a more direct input cost signal than global USD prices for predicting Indian equity gaps.

### Group C: Pre-Market Context (4)

| #   | Feature                         | Source                  | Description                                     | Example |
| --- | ------------------------------- | ----------------------- | ----------------------------------------------- | ------- |
| 21  | `actual_gap_pct`                | derived                 | `(freeze_price - prev_close) / prev_close` as % | +0.45%  |
| 22  | `expected_opening_volatility`   | Tier 0 preliminary pass | Pre-computed volatility estimate                | 0.72    |
| 23  | `pre_market_bias`               | derived                 | Directional bias from GIFT Nifty + global       | 0.65    |
| 24  | `overnight_mcx_energy_pressure` | derived from #13+#14    | Composite energy pressure score                 | 0.4     |

### Feature Collection Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    TIER 0 DATA COLLECTION                               │
│                                                                         │
│  00:00 IST ────────────────────────────── 09:08 IST                     │
│                                                                         │
│  ┌──────────────┐   Continuous polling every 5 minutes                  │
│  │ Yahoo Finance│   → S&P 500 E-mini, Nasdaq E-mini, Nikkei             │
│  │ API          │   → Brent crude, Gold, USD/INR                        │
│  └──────┬───────┘   → Store snapshots in QuestDB global_market_data     │
│         │                                                               │
│  ┌──────┴──────┐   Continuous from 09:00 IST (MCX session open)         │
│  │ Upstox WS   │   → MCX_FO|CRUDEOIL, NATURALGAS, GOLD, SILVER, COPPER  │
│  │ (MCX_FO|*)  │   → Overnight % change computed vs prev MCX close      │
│  └──────┬──────┘   → mcx_* features written to Redis                    │
│         │                                                               │
│  ┌──────┴──────┐   Continuous from 08:00 IST                            │
│  │ GIFT Nifty  │   → 1-second tick data via Upstox/NSE feed             │
│  │ Feed        │   → premium = LTP - prev_nifty_close                   │
│  └──────┬──────┘                                                        │
│         │                                                               │
│  ┌──────┴──────┐   Rolling NLP pipeline                                 │
│  │ Finnhub     │   → Fetch India-relevant headlines overnight           │
│  │ + FinBERT   │   → FinBERT inference → aggregate sentiment [-1,+1]    │
│  └──────┬──────┘                                                        │
│         │                                                               │
│  ┌──────┴──────┐   At 09:08:05 IST                                      │
│  │ Upstox      │   → Capture pre-open freeze indicative price           │
│  │ Pre-Open    │   → Compute actual_gap_points + pre_market_bias        │
│  └──────┬──────┘                                                        │
│         │                                                               │
│         ▼                                                               │
│  ┌─────────────────────────────────────────────────────┐                │
│  │ FEATURE VECTOR (24 features) → XGBoost ONNX → Pred  │                │
│  └─────────────────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Output Schema

```json
{
  "tier": 0,
  "timestamp": "2026-03-13T09:08:05.000+05:30",
  "model": "xgboost_gap_predictor_v2",
  "predictions": {
    "expected_gap_pct": 0.45,
    "expected_volatility": "HIGH",
    "opening_bias": 0.65,
    "confidence": 0.78
  },
  "feature_importance": {
    "gift_nifty_premium": 0.32,
    "actual_gap_points": 0.28,
    "sp500_overnight_return": 0.15,
    "overnight_news_sentiment": 0.08
  },
  "shap_values": { ... }
}
```

| Output Field          | Type  | Range               | Description                                       |
| --------------------- | ----- | ------------------- | ------------------------------------------------- |
| `expected_gap_pct`    | float | [-3.0, +3.0]        | Predicted gap as % of previous close              |
| `expected_volatility` | enum  | LOW / MEDIUM / HIGH | Expected first-15-min volatility regime           |
| `opening_bias`        | float | [0.0, 1.0]          | Directional bias (>0.5 = bullish, <0.5 = bearish) |
| `confidence`          | float | [0.0, 1.0]          | Model confidence (calibrated probability)         |

### How Downstream Tiers Consume This Output

| Consumer                        | What It Uses                                              | How                                                                 |
| ------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------- |
| **Tier 1** (Macro Director)     | `expected_gap_pct`, `expected_volatility`, `opening_bias` | As 3 of its 32 input features for regime classification             |
| **Tier 2** (Intraday Navigator) | `expected_volatility`                                     | Adjusts position sizing and sensitivity thresholds                  |
| **Tier 4** (Meta-Learner)       | `confidence`                                              | Adjusts weight given to "gap fill" vs "gap continuation" strategies |
| **Risk Manager**                | `expected_volatility`                                     | Widens stop-loss for HIGH volatility, tightens for LOW              |

### Redis Caching

```
Key:    tier0:gap:2026-03-13
TTL:    End of trading day (15:30 IST)
Value:  JSON output above
```

---

## Pre-Trade Session Opportunity (09:08 – 09:14:59)

This 7-minute window is a unique edge. While the equity market is frozen, we can still:

### 1. Estimate Option Greeks from Indicative Price

Once the NIFTY pre-open freeze price is known (09:08), we can compute **synthetic option Greeks** using Black-Scholes with the frozen indicative price as the underlying:

```python
from scipy.stats import norm
import numpy as np

def estimate_greeks_from_indicative(
    indicative_price: float,    # 09:08 freeze NIFTY price
    strike: float,              # Option strike price
    days_to_expiry: float,      # Calendar days to expiry
    risk_free_rate: float,      # MIBOR overnight rate
    estimated_iv: float         # Previous day's ATM IV as proxy
) -> dict:
    """
    Compute synthetic Greeks for option chain using the pre-open indicative price.
    These are estimates — actual Greeks will shift when continuous trading begins.
    """
    T = days_to_expiry / 365.0
    S = indicative_price
    K = strike
    r = risk_free_rate
    sigma = estimated_iv

    d1 = (np.log(S/K) + (r + sigma**2/2)*T) / (sigma*np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)

    delta = norm.cdf(d1)  # CE delta
    gamma = norm.pdf(d1) / (S * sigma * np.sqrt(T))
    vega = S * norm.pdf(d1) * np.sqrt(T) / 100
    theta = -(S * norm.pdf(d1) * sigma) / (2 * np.sqrt(T)) / 365

    return {
        'delta': delta,
        'gamma': gamma,
        'vega': vega,
        'theta': theta,
        'estimated_ce_price': S * norm.cdf(d1) - K * np.exp(-r*T) * norm.cdf(d2),
        'estimated_pe_price': K * np.exp(-r*T) * norm.cdf(-d2) - S * norm.cdf(-d1)
    }
```

### 2. Compute the Overnight Candle

At **09:14:55 IST** (5 seconds before market open), we consolidate ALL global data collected since previous close into a single synthetic "overnight candle":

```python
def build_overnight_candle(
    global_snapshots: list[dict],  # 5-min snapshots since 15:30 IST yesterday
    tier0_output: dict,             # Tier 0 XGBoost predictions
    indicative_price: float,        # 09:08 freeze price
    prev_close: float               # Yesterday's NIFTY close
) -> dict:
    """
    Consolidate 17+ hours of global data into a single context vector
    for Tier 1 and Tier 2 bootstrapping at 09:15.
    """
    return {
        'timestamp': '09:14:55',
        'overnight_candle': {
            'open': prev_close,
            'high': max(s['gift_nifty'] for s in global_snapshots),
            'low': min(s['gift_nifty'] for s in global_snapshots),
            'close': indicative_price,
            'volume': sum(s.get('gift_nifty_volume', 0) for s in global_snapshots),
        },
        'global_context': {
            'us_session_return': global_snapshots[-1]['sp500_return'],
            'asia_session_return': global_snapshots[-1]['nikkei_return'],
            'commodity_pressure': global_snapshots[-1]['brent_change'],
            'currency_pressure': global_snapshots[-1]['usd_inr_change'],
            'sentiment': global_snapshots[-1]['news_sentiment'],
        },
        'tier0_predictions': tier0_output['predictions'],
        'synthetic_greeks': {
            # Pre-computed at 09:08 using indicative price
            'atm_ce_delta': 0.52,
            'atm_pe_delta': -0.48,
            'atm_gamma': 0.0015,
            'estimated_atm_iv': 0.165,
        }
    }
```

This overnight candle is published to Redis at `tier0:overnight_candle:{date}` and consumed by Tier 1 and Tier 2 at market open.

---

## Training Specification

### Data Preparation

```python
def prepare_tier0_training_data(
    nifty_daily: pd.DataFrame,       # Daily OHLCV with prev_close
    global_overnight: pd.DataFrame,  # Overnight global snapshots
    mcx_overnight: pd.DataFrame,     # MCX overnight snapshots (from Upstox WS)
    pre_open_data: pd.DataFrame,     # 09:08 freeze prices
    sentiment_data: pd.DataFrame     # Overnight sentiment scores
) -> tuple[pd.DataFrame, pd.Series]:
    """
    Build training dataset: one row per trading day.
    Target: actual realized gap at 09:15.
    """
    features = pd.DataFrame()

    # Group A: Global Overnight Markets (12 features)
    features['gift_nifty_premium'] = pre_open_data['freeze_price'] - nifty_daily['prev_close']
    features['sp500_overnight_return'] = global_overnight['sp500_pct']
    features['nasdaq_overnight_return'] = global_overnight['nasdaq_pct']
    features['nikkei_return'] = global_overnight['nikkei_pct']
    features['brent_crude_change'] = global_overnight['brent_pct']
    features['brent_wti_spread'] = global_overnight['brent'] - global_overnight['wti']
    features['gold_change'] = global_overnight['gold_pct']
    features['usd_inr_change'] = global_overnight['usd_inr_pct']
    features['overnight_news_sentiment'] = sentiment_data['aggregate_sentiment']
    features['actual_gap_points'] = pre_open_data['freeze_price'] - nifty_daily['prev_close']
    features['prev_day_range'] = (nifty_daily['high'] - nifty_daily['low']) / nifty_daily['close']
    features['prev_day_close_vs_vwap'] = nifty_daily['close_vs_vwap']

    # Group B: MCX Commodity Snapshot (8 features — NEW)
    features['mcx_crudeoil_change'] = mcx_overnight['crudeoil_pct']
    features['mcx_naturalgas_change'] = mcx_overnight['naturalgas_pct']
    features['mcx_gold_change'] = mcx_overnight['gold_pct']
    features['mcx_silver_change'] = mcx_overnight['silver_pct']
    features['mcx_copper_change'] = mcx_overnight['copper_pct']
    features['brent_mcx_crudeoil_spread'] = global_overnight['brent_inr'] - mcx_overnight['crudeoil_price']
    features['mcx_commodity_breadth'] = (mcx_overnight[['crudeoil_pct','naturalgas_pct','gold_pct','silver_pct','copper_pct']] > 0).mean(axis=1)
    features['mcx_intraday_regime'] = features[['mcx_crudeoil_change','mcx_naturalgas_change','mcx_gold_change','mcx_silver_change','mcx_copper_change']].mean(axis=1)

    # Group C: Pre-Market Context (4 features)
    features['actual_gap_pct'] = (pre_open_data['freeze_price'] - nifty_daily['prev_close']) / nifty_daily['prev_close'] * 100
    features['expected_opening_volatility'] = features['actual_gap_pct'].abs().rolling(20).mean()  # smoothed proxy
    features['pre_market_bias'] = features['gift_nifty_premium'].apply(lambda x: np.clip(x / 100, -1, 1))
    features['overnight_mcx_energy_pressure'] = (features['mcx_crudeoil_change'] + features['mcx_naturalgas_change']) / 2

    # Target: realized gap at 09:15
    target = (nifty_daily['open'] - nifty_daily['prev_close']) / nifty_daily['prev_close'] * 100

    return features, target
```

### XGBoost Configuration

```python
import xgboost as xgb

TIER0_XGB_PARAMS = {
    'objective': 'reg:squarederror',  # Regression for gap magnitude
    'max_depth': 5,
    'learning_rate': 0.05,
    'n_estimators': 500,
    'subsample': 0.8,
    'colsample_bytree': 0.8,
    'min_child_weight': 10,
    'reg_alpha': 0.1,
    'reg_lambda': 1.0,
    'early_stopping_rounds': 50,
    'eval_metric': 'rmse'
}

# Secondary classifier for volatility regime
TIER0_VOL_PARAMS = {
    'objective': 'multi:softprob',
    'num_class': 3,  # LOW, MEDIUM, HIGH
    'max_depth': 4,
    'learning_rate': 0.05,
    'n_estimators': 300,
}
```

### Combinatorial Purged Cross-Validation (CPCV)

```python
def cpcv_validate_tier0(features, target, n_splits=5, n_test_splits=2, purge_days=5, embargo_days=5):
    """
    CPCV validation for daily data.
    Even though this is daily data, macroeconomic regimes and volatility clustering
    span across train/test boundaries. Strict purging and embargoing are mandatory
    to prevent target leakage.
    
    Note: With ~1000 daily samples/year (4yr = ~4000 total) and 24 features,
    CPCV with 5 splits / 2 test splits gives ~1600 train / ~800 test per fold.
    This is adequate for 24-feature XGBoost (well above the 10x features rule).
    """
    from cpcv import CombinatorialPurgedKFold
    
    cv = CombinatorialPurgedKFold(
        n_splits=n_splits, 
        n_test_splits=n_test_splits,
        purge_gap=purge_days,
        embargo_gap=embargo_days
    )
    
    results = []
    dates = features.index.to_series()
    
    for fold, (train_idx, test_idx) in enumerate(cv.split(features, target)):
        model = xgb.XGBRegressor(**TIER0_XGB_PARAMS)
        model.fit(features.iloc[train_idx], target.iloc[train_idx],
                  eval_set=[(features.iloc[test_idx], target.iloc[test_idx])],
                  verbose=False)

        preds = model.predict(features.iloc[test_idx])
        direction_acc = ((preds > 0) == (target.iloc[test_idx] > 0)).mean()

        results.append({
            'fold': fold,
            'direction_accuracy': direction_acc,
            'rmse': np.sqrt(((preds - target.iloc[test_idx])**2).mean()),
            'mae': np.abs(preds - target.iloc[test_idx]).mean()
        })

    return pd.DataFrame(results)
```

---

## ONNX Export

```python
def export_tier0_to_onnx(model, output_path='models/tier0_gap_predictor.onnx'):
    """Export trained XGBoost to ONNX for algo-worker inference."""
    from skl2onnx import convert_sklearn
    from skl2onnx.common.data_types import FloatTensorType

    initial_type = [('features', FloatTensorType([None, 24]))]  # 24 features (was 12)
    onnx_model = convert_sklearn(model, initial_types=initial_type)

    with open(output_path, 'wb') as f:
        f.write(onnx_model.SerializeToString())

    # Validate
    import onnxruntime as ort
    session = ort.InferenceSession(output_path)
    test_input = np.random.randn(1, 24).astype(np.float32)  # 24 features
    onnx_pred = session.run(None, {'features': test_input})[0]
    original_pred = model.predict(test_input)
    assert np.allclose(onnx_pred, original_pred, atol=1e-4), "ONNX export mismatch!"
```

---

## Performance Targets

### Mandatory Baseline: Freeze Price → Open

Since the 09:08 freeze/IEP (Indicative Equilibrium Price) already contains most of the gap information via the pre-open call auction, the model MUST be benchmarked against a naive baseline:

```
Baseline: predicted_open = freeze_price
Baseline gap prediction: actual_gap_pct = (freeze_price - prev_close) / prev_close * 100
```

The model only adds value if it improves on this baseline. Key baseline metrics to report:
- **Baseline RMSE** of (actual_open - freeze_price) / prev_close
- **Baseline direction accuracy** of sign(freeze_price - prev_close) vs sign(actual_open - prev_close)

If the model cannot beat this baseline by a statistically significant margin (p < 0.05 on paired t-test), the model should be replaced by the naive baseline to avoid unnecessary complexity.

| Metric                     | Target | Validation   |
| -------------------------- | ------ | ------------ |
| Gap direction accuracy     | >65%   | Walk-forward |
| RMSE (gap %)               | <0.35% | Walk-forward |
| Volatility regime accuracy | >60%   | Walk-forward |
| Inference latency          | <5ms   | Benchmark    |
| Memory footprint           | <20MB  | Profiled     |

---

## Inference Integration (algo-worker)

```typescript
// apps/algo-worker/src/layers/prediction/tier0.service.ts

@Injectable()
export class Tier0Service {
  private session: ort.InferenceSession;

  async onModuleInit() {
    this.session = await ort.InferenceSession.create(
      "models/tier0_gap_predictor.onnx",
      { executionProviders: ["CPUExecutionProvider"] }, // CPU is fine for 12 features
    );
  }

  @Cron("5 8 9 * * 1-5", { timeZone: "Asia/Kolkata" }) // 09:08:05 IST, weekdays
  async predictGap(): Promise<Tier0Output> {
    const features = await this.collectOvernightFeatures();

    const tensor = new ort.Tensor(
      "float32",
      new Float32Array(features),
      [1, 24], // 24 features: 12 global + 8 MCX + 4 pre-market
    );
    const result = await this.session.run({ features: tensor });

    const output: Tier0Output = {
      expected_gap_pct: result.output.data[0],
      expected_volatility: this.classifyVolatility(features),
      opening_bias: this.computeBias(result.output.data[0], features),
      confidence: this.calibrateConfidence(result),
    };

    // Cache in Redis for downstream tiers
    await this.redis.set(
      `tier0:gap:${todayDate()}`,
      JSON.stringify(output),
      "EX",
      28800,
    );
    await this.eventBus.publish(new Tier0PredictionEvent(output));

    return output;
  }
}
```

---

## Related Documentation

- [MODEL_PIPELINE_WORKFLOW.md](./MODEL_PIPELINE_WORKFLOW.md) — Full session-by-session timing
- [TIER1_MODELS.md](./TIER1_MODELS.md) — Macro Director (consumes Tier 0 output)
- [MODEL_ARCHITECTURE.md](./MODEL_ARCHITECTURE.md) — 5-Tier overview
- [TRAINING_PIPELINE.md](./TRAINING_PIPELINE.md) — Training infrastructure
