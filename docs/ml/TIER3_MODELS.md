# TIER 3: Microstructure Scalper — Order Flow Intelligence

> **Reads live Depth-30 LOB, option Greeks, and order flow imbalance every 100ms to detect buy/sell pressure and estimate slippage for 10s-1min horizons. Uses phased activation: rules → MLP → full LiT Transformer.**

**Last Updated**: March 13, 2026
**Tier**: 3 — Microstructure Scalper
**Runs**: Every 100ms during market hours (09:15 – 15:30 IST)
**Data Depth**: Live WebSocket only (no historical training data initially)

---

## Purpose

Tier 3 answers: **"Right now, in the next 10 seconds to 1 minute, is there more buy or sell pressure?"**

While Tier 2 predicts direction over 5-30 minutes using historical patterns, Tier 3 reads the **live order book microstructure** — the actual buy and sell orders sitting on the exchange — to detect:

1. **Order Flow Imbalance (OFI)**: Are aggressive buyers or sellers dominating?
2. **Depth Imbalance**: Is the bid side deeper than the ask side (or vice versa)?
3. **Sweep Detection**: Are large institutional orders sweeping through multiple price levels?
4. **Slippage Estimation**: How much impact will our order have on the market?

This information is critical for **execution timing** — knowing that heavy buying pressure exists in the next 10 seconds means we should enter immediately rather than waiting.

---

## Why Phased Activation?

### The Cold Start Problem

Unlike Tier 2 (which has 4 years of historical 1-min data), Tier 3 operates on **live LOB data only**. When the system first goes live:

- There is ZERO historical Depth-30 LOB data (Upstox doesn't provide historical LOB)
- Training a Transformer on 0 data is impossible
- But we can still extract value from the LOB using analytical rules

### Three-Phase Deployment

| Phase       | Timeline   | Model                             | Data Required         | Accuracy Target |
| ----------- | ---------- | --------------------------------- | --------------------- | --------------- |
| **Phase 1** | Months 1-3 | Analytical rules (OFI thresholds) | None (pure math)      | >55% direction  |
| **Phase 2** | Months 4-6 | Shallow MLP (2-layer, 64 hidden)  | ~3 months of LOB data | >58% direction  |
| **Phase 3** | Month 6+   | Full LiT Transformer              | ~6 months of LOB data | >65% direction  |

### Phase Transition Criteria

```python
def should_upgrade_phase(current_phase: int, data_stats: dict) -> bool:
    """Determine if Tier 3 should upgrade to the next phase."""
    if current_phase == 1:
        # Phase 1 → 2: Need 3 months of LOB data + Phase 1 accuracy > 55%
        return (
            data_stats['lob_samples'] > 3 * 252 * 375 * 10  # 3mo × days × mins × 10/min
            and data_stats['phase1_accuracy'] > 0.55
        )
    elif current_phase == 2:
        # Phase 2 → 3: Need 6 months of LOB data + Phase 2 accuracy > 58%
        return (
            data_stats['lob_samples'] > 6 * 252 * 375 * 10
            and data_stats['phase2_accuracy'] > 0.58
        )
    return False
```

---

## Input Features (14)

All computed from live WebSocket data every 100ms.

| #   | Feature                 | Formula                                    | Range     | Description                   |
| --- | ----------------------- | ------------------------------------------ | --------- | ----------------------------- |
| 1   | `ofi_1s`                | Δ(bid_vol_L1) − Δ(ask_vol_L1) over 1s      | [-1, +1]  | 1-second Order Flow Imbalance |
| 2   | `ofi_5s`                | Δ(bid_vol_L1) − Δ(ask_vol_L1) over 5s      | [-1, +1]  | 5-second Order Flow Imbalance |
| 3   | `ofi_30s`               | Δ(bid_vol_L1) − Δ(ask_vol_L1) over 30s     | [-1, +1]  | 30-second OFI (smoothed)      |
| 4   | `trade_imbalance`       | (buy_volume − sell_volume) / total_volume  | [-1, +1]  | Aggressive trade direction    |
| 5   | `depth_imbalance_5`     | (Σbid_vol_L1-5 − Σask_vol_L1-5) / total    | [-1, +1]  | 5-level book imbalance        |
| 6   | `depth_imbalance_10`    | (Σbid_vol_L1-10 − Σask_vol_L1-10) / total  | [-1, +1]  | 10-level book imbalance       |
| 7   | `volume_at_bid_pct`     | Volume traded at bid / total volume        | [0, 1]    | Sell-side aggression          |
| 8   | `large_trade_indicator` | 1 if last trade > 5× average, else 0       | {0, 1}    | Institutional activity        |
| 9   | `bid_ask_slope`         | Regression slope of bid depth vs level     | [-∞, +∞]  | Book shape (convex/concave)   |
| 10  | `spread_normalized`     | (ask_L1 − bid_L1) / mid_price              | [0, 0.01] | Market tightness              |
| 11  | `mid_price_change`      | Δmid_price over last 100ms                 | [-∞, +∞]  | Price velocity                |
| 12  | `order_arrival_rate`    | New orders per second (both sides)         | [0, ∞)    | Market activity level         |
| 13  | `cancellation_rate`     | Cancelled orders / total orders per second | [0, 1]    | Spoofing/uncertainty          |
| 14  | `sweep_detector`        | 1 if volume > 3× depth at price level      | {0, 1}    | Level sweep detection         |

### Feature Computation (in compute-engine Rust)

```rust
pub fn compute_ofi(
    current_lob: &DepthSnapshot,
    prev_lob: &DepthSnapshot,
    window_seconds: f64
) -> f64 {
    let bid_delta = current_lob.bid_volume_l1 - prev_lob.bid_volume_l1;
    let ask_delta = current_lob.ask_volume_l1 - prev_lob.ask_volume_l1;

    let raw_ofi = bid_delta - ask_delta;
    let normalizer = (bid_delta.abs() + ask_delta.abs()).max(1.0);

    (raw_ofi / normalizer).clamp(-1.0, 1.0)
}

pub fn compute_depth_imbalance(lob: &DepthSnapshot, levels: usize) -> f64 {
    let bid_vol: f64 = lob.bids[..levels].iter().map(|l| l.quantity).sum();
    let ask_vol: f64 = lob.asks[..levels].iter().map(|l| l.quantity).sum();

    let total = bid_vol + ask_vol;
    if total == 0.0 { return 0.0; }

    (bid_vol - ask_vol) / total
}
```

---

## Phase 1: Analytical Rules (Months 1-3)

No ML — pure mathematical signal extraction.

```python
class Phase1RuleBasedPredictor:
    """
    Analytical OFI-based microstructure predictor.
    No ML required — pure threshold-based signals.
    """

    def __init__(self):
        self.ofi_threshold = 0.3        # Significant imbalance
        self.depth_threshold = 0.25     # Significant depth skew
        self.sweep_weight = 0.5         # Sweep detection importance

    def predict(self, features: dict) -> dict:
        """
        Returns buy_pressure, sell_pressure, slippage_estimate.
        """
        # Weighted OFI signal
        ofi_signal = (
            0.5 * features['ofi_1s'] +
            0.3 * features['ofi_5s'] +
            0.2 * features['ofi_30s']
        )

        # Depth signal
        depth_signal = (
            0.6 * features['depth_imbalance_5'] +
            0.4 * features['depth_imbalance_10']
        )

        # Trade flow signal
        trade_signal = features['trade_imbalance']

        # Sweep boost (large trades amplify signal)
        sweep_mult = 1.0 + self.sweep_weight * features['sweep_detector']

        # Combined signal
        raw_signal = (0.4 * ofi_signal + 0.3 * depth_signal + 0.3 * trade_signal) * sweep_mult

        # Slippage estimation (wider spread + lower depth = more slippage)
        slippage = features['spread_normalized'] * (1.0 + 0.5 / max(features['order_arrival_rate'], 1))

        buy_pressure = max(0, raw_signal)
        sell_pressure = max(0, -raw_signal)

        return {
            'buy_pressure': min(buy_pressure, 1.0),
            'sell_pressure': min(sell_pressure, 1.0),
            'slippage_estimate_bps': slippage * 10000,
            'signal_strength': abs(raw_signal),
            'model_phase': 1
        }
```

---

## Phase 2: Shallow MLP (Months 4-6)

Once we have ~3 months of LOB data, train a simple 2-layer MLP.

```python
class Phase2MLP(nn.Module):
    """Shallow MLP for microstructure prediction. First ML model for Tier 3."""

    def __init__(self, input_dim: int = 14, hidden_dim: int = 64):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim, 3)  # buy_pressure, sell_pressure, slippage
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)
```

---

## Phase 3: LiT Transformer (Month 6+)

The full **L**imit Order Book **T**ransformer.

### Architecture

```python
class LiTTransformer(nn.Module):
    """
    Limit Order Book Transformer for microstructure prediction.
    Input: Depth-30 LOB snapshot [30 levels × 4 features]
    Output: 3-class (UP/NEUTRAL/DOWN) for 10s horizon
    """

    def __init__(
        self,
        n_levels: int = 30,         # LOB depth
        n_features: int = 4,        # bid_price, bid_qty, ask_price, ask_qty
        patch_size: int = 3,        # Group 3 levels into one patch
        d_model: int = 128,
        n_heads: int = 8,
        n_layers: int = 6,
        n_classes: int = 3
    ):
        super().__init__()

        self.n_patches = n_levels // patch_size  # 10 patches

        # Patch embedding: [3 levels × 4 features] = 12 → d_model
        self.patch_embed = nn.Linear(patch_size * n_features, d_model)

        # Positional encoding (learnable)
        self.pos_embed = nn.Parameter(torch.randn(1, self.n_patches + 1, d_model))

        # CLS token (classification token, like BERT/ViT)
        self.cls_token = nn.Parameter(torch.randn(1, 1, d_model))

        # Transformer encoder
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model, nhead=n_heads,
            dim_feedforward=d_model * 4,
            dropout=0.1, batch_first=True
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, n_layers)

        # Auxiliary input: 14 order flow features → inject via cross-attention
        self.ofi_proj = nn.Linear(14, d_model)

        # Classification head
        self.classifier = nn.Sequential(
            nn.LayerNorm(d_model),
            nn.Linear(d_model, d_model // 2),
            nn.GELU(),
            nn.Dropout(0.1),
            nn.Linear(d_model // 2, n_classes)
        )

    def forward(self, lob: torch.Tensor, ofi_features: torch.Tensor) -> torch.Tensor:
        """
        Args:
            lob: [B, 30, 4] — Depth-30 LOB snapshot
            ofi_features: [B, 14] — computed order flow features
        Returns:
            logits: [B, 3] — UP/NEUTRAL/DOWN
        """
        B = lob.shape[0]

        # Create patches: [B, 30, 4] → [B, 10, 12] → embed → [B, 10, d_model]
        patches = lob.reshape(B, self.n_patches, -1)
        embedded = self.patch_embed(patches)

        # Add CLS token
        cls = self.cls_token.expand(B, -1, -1)
        tokens = torch.cat([cls, embedded], dim=1)  # [B, 11, d_model]

        # Add positional encoding
        tokens = tokens + self.pos_embed

        # Inject OFI features as additional token
        ofi_token = self.ofi_proj(ofi_features).unsqueeze(1)  # [B, 1, d_model]
        tokens = torch.cat([tokens, ofi_token], dim=1)  # [B, 12, d_model]

        # Transformer
        encoded = self.transformer(tokens)

        # Classify using CLS token
        return self.classifier(encoded[:, 0])
```

### Input / Output

|                 | Specification                                            |
| --------------- | -------------------------------------------------------- |
| **Input**       | LOB: `[B, 30, 4]`, OFI features: `[B, 14]`               |
| **Output**      | `[B, 3]` — P(down), P(neutral), P(up) in next 10 seconds |
| **Inference**   | ~8ms (GPU via ONNX)                                      |
| **ONNX Export** | Dual-input ONNX with dynamic batch axis                  |

---

## Output Schema

```json
{
  "tier": 3,
  "timestamp": "2026-03-13T10:15:00.100+05:30",
  "model_phase": 3,
  "predictions": {
    "buy_pressure": 0.72,
    "sell_pressure": 0.18,
    "slippage_estimate_bps": 3.5,
    "direction_10s": { "up": 0.65, "neutral": 0.22, "down": 0.13 },
    "signal_strength": 0.54
  }
}
```

### Downstream Consumption

| Consumer                  | What It Uses                       | How                                  |
| ------------------------- | ---------------------------------- | ------------------------------------ |
| **Tier 4** (Meta-Learner) | `buy_pressure`, `sell_pressure`    | Micro-level directional confirmation |
| **Execution Layer**       | `slippage_estimate_bps`            | Optimize limit price offset          |
| **PPO Agent**             | `signal_strength`, `direction_10s` | Decide wait vs execute immediately   |
| **Risk Manager**          | `sweep_detector`                   | Detect institutional flow            |

---

## Training Specification (Phase 3)

### Label Generation

```python
def generate_tier3_labels(lob_data: pd.DataFrame, horizon_seconds: int = 10) -> pd.Series:
    """
    Label: mid-price direction in next 10 seconds.
    Since LOB updates every 100ms, horizon = 100 steps.
    """
    mid_price = (lob_data['bid_L1'] + lob_data['ask_L1']) / 2
    forward_return = mid_price.shift(-100) / mid_price - 1  # 100 × 100ms = 10s

    threshold = 0.0002  # 2 bps — microstructure-level threshold
    labels = np.where(forward_return < -threshold, 0,
             np.where(forward_return > threshold, 2, 1))
    return labels
```

### Validation

```python
TIER3_TRAINING_CONFIG = {
    'data': 'Live LOB snapshots (collected in production)',
    'resolution': '100ms',
    'validation': 'rolling_window',
    'train_window_days': 90,
    'test_window_days': 10,
    'min_accuracy': 0.60,
    'retraining': 'monthly'
}
```

---

## Performance Targets

| Metric                   | Phase 1 | Phase 2 | Phase 3 |
| ------------------------ | ------- | ------- | ------- |
| Direction accuracy (10s) | >55%    | >58%    | >65%    |
| AUC-ROC                  | N/A     | >0.60   | >0.65   |
| Inference latency        | <1ms    | <3ms    | <8ms    |
| Memory footprint         | <1MB    | <10MB   | <100MB  |

---

## Related Documentation

- [TIER2_MODELS.md](./TIER2_MODELS.md) — Complementary intraday predictions
- [TIER4_MODELS.md](./TIER4_MODELS.md) — Fuses Tier 3 with other tiers
- [MODEL_PIPELINE_WORKFLOW.md](./MODEL_PIPELINE_WORKFLOW.md) — 100ms loop detail
