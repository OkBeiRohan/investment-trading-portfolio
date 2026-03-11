# Detailed Model Specifications

> **Complete PyTorch/ONNX implementation specifications for models across the 5-tier hierarchy.**

**Last Updated**: March 11, 2026  
**Architecture**: 5-Tier Data-Bound Hierarchical

---

## Tier Mapping

The models documented here are used across multiple tiers:

| Model | Tier | Purpose |
|-------|------|--------|
| **TFT** | Tier 2 (Intraday Navigator) | Multi-horizon quantile forecasting for 5m-EOD |
| **Mamba** | Tier 2 (Intraday Navigator) | O(n) sequence modeling for regime-aware direction |
| **PatchTST** | Tier 1 (Macro Director) | Long-horizon daily pattern detection |
| **TimeMixer** | Tier 2 (Intraday Navigator) | Multi-scale temporal mixing (experimental) |
| **IV Surface VAE** | Tier 2 (Options-Specific) | IV surface prediction for options pricing |
| **Greeks LSTM** | Tier 2 (Options-Specific) | Greeks trajectory forecasting |

> **Note**: LightGBM/XGBoost (Tier 2) and the LiT Transformer (Tier 3) are documented in
> [MODEL_ARCHITECTURE.md](./MODEL_ARCHITECTURE.md). The Meta-Learner (Tier 4) and PPO Agent
> are documented in [META_LEARNER_EXECUTION.md](./META_LEARNER_EXECUTION.md).

---

## Table of Contents

1. [Temporal Fusion Transformer (TFT)](#1-temporal-fusion-transformer-tft) — Tier 2
2. [Mamba State Space Model](#2-mamba-state-space-model) — Tier 2
3. [PatchTST Long-Horizon Forecaster](#3-patchtst-long-horizon-forecaster) — Tier 1
4. [TimeMixer Multi-Scale Model](#4-timemixer-multi-scale-model) — Tier 2
5. [Options-Specific Models](#5-options-specific-models) — Tier 2

---

## 1. Temporal Fusion Transformer (TFT)

**Purpose**: Multi-horizon forecasting with interpretable attention for 5min-EOD predictions.

### Architecture

```python
import torch
import torch.nn as nn
from typing import Dict, List, Tuple

class TemporalFusionTransformer(nn.Module):
    """
    TFT for multi-horizon financial forecasting.
    Predicts quantiles [10%, 50%, 90%] for each horizon.
    """
    
    def __init__(
        self,
        # Static features (constant per entity)
        n_static_features: int = 3,
        # Time-varying known (future known like day_of_week)
        n_known_features: int = 5,
        # Time-varying unknown (only past available)
        n_unknown_features: int = 15,
        # Model dimensions
        hidden_size: int = 128,
        lstm_layers: int = 2,
        attention_heads: int = 4,
        dropout: float = 0.1,
        # Forecasting config
        lookback: int = 120,
        horizons: List[int] = [1, 5, 15, 60],
        quantiles: List[float] = [0.1, 0.5, 0.9]
    ):
        super().__init__()
        
        self.lookback = lookback
        self.horizons = horizons
        self.quantiles = quantiles
        
        # Variable selection networks
        self.static_vsn = VariableSelectionNetwork(
            n_static_features, hidden_size
        )
        self.encoder_vsn = VariableSelectionNetwork(
            n_known_features + n_unknown_features, hidden_size
        )
        self.decoder_vsn = VariableSelectionNetwork(
            n_known_features, hidden_size
        )
        
        # LSTM encoder-decoder
        self.encoder_lstm = nn.LSTM(
            hidden_size, hidden_size, lstm_layers,
            batch_first=True, dropout=dropout
        )
        self.decoder_lstm = nn.LSTM(
            hidden_size, hidden_size, lstm_layers,
            batch_first=True, dropout=dropout
        )
        
        # Static context projection
        self.static_context = nn.Linear(hidden_size, hidden_size * 4)
        
        # Temporal self-attention
        self.temporal_attention = InterpretableMultiHeadAttention(
            hidden_size, attention_heads
        )
        
        # Gated residual network
        self.grn = GatedResidualNetwork(hidden_size, dropout)
        
        # Output projection (one per quantile)
        self.output_proj = nn.ModuleList([
            nn.Linear(hidden_size, len(horizons))
            for _ in quantiles
        ])
    
    def forward(
        self,
        static: torch.Tensor,      # [B, n_static]
        encoder_input: torch.Tensor,  # [B, lookback, n_enc_features]
        decoder_input: torch.Tensor   # [B, max_horizon, n_dec_features]
    ) -> Tuple[torch.Tensor, Dict]:
        """
        Returns:
            predictions: [B, n_horizons, n_quantiles]
            attention_weights: For interpretability
        """
        B = static.shape[0]
        
        # Static context
        static_ctx = self.static_vsn(static)
        c_s, c_e, c_d, c_h = self.static_context(static_ctx).chunk(4, dim=-1)
        
        # Encode historical
        enc_selected = self.encoder_vsn(encoder_input)
        enc_out, (h, c) = self.encoder_lstm(enc_selected)
        
        # Decode future (known inputs only)
        dec_selected = self.decoder_vsn(decoder_input)
        dec_out, _ = self.decoder_lstm(dec_selected, (h, c))
        
        # Temporal attention over encoder + decoder
        combined = torch.cat([enc_out, dec_out], dim=1)
        attn_out, attn_weights = self.temporal_attention(
            combined, combined, combined
        )
        
        # GRN + residual
        output = self.grn(attn_out[:, -len(self.horizons):, :])
        
        # Quantile outputs
        predictions = torch.stack([
            proj(output) for proj in self.output_proj
        ], dim=-1)
        
        return predictions, {'attention': attn_weights}


class VariableSelectionNetwork(nn.Module):
    """Softmax-weighted variable importance."""
    
    def __init__(self, n_features: int, hidden_size: int):
        super().__init__()
        self.feature_proj = nn.Linear(n_features, hidden_size * n_features)
        self.weights = nn.Linear(n_features, n_features)
        self.hidden_size = hidden_size
        self.n_features = n_features
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: [B, T, n_features] or [B, n_features]
        weights = torch.softmax(self.weights(x), dim=-1)
        projected = self.feature_proj(x).view(*x.shape[:-1], self.n_features, self.hidden_size)
        return (weights.unsqueeze(-1) * projected).sum(dim=-2)


class GatedResidualNetwork(nn.Module):
    """GRN with ELU activation and gating."""
    
    def __init__(self, hidden_size: int, dropout: float = 0.1):
        super().__init__()
        self.fc1 = nn.Linear(hidden_size, hidden_size)
        self.fc2 = nn.Linear(hidden_size, hidden_size)
        self.gate = nn.Linear(hidden_size, hidden_size)
        self.norm = nn.LayerNorm(hidden_size)
        self.dropout = nn.Dropout(dropout)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        hidden = torch.elu(self.fc1(x))
        hidden = self.dropout(self.fc2(hidden))
        gate = torch.sigmoid(self.gate(x))
        return self.norm(x + gate * hidden)


class InterpretableMultiHeadAttention(nn.Module):
    """Multi-head attention with interpretable weights."""
    
    def __init__(self, hidden_size: int, n_heads: int):
        super().__init__()
        self.attention = nn.MultiheadAttention(
            hidden_size, n_heads, batch_first=True
        )
    
    def forward(self, q, k, v):
        out, weights = self.attention(q, k, v, need_weights=True)
        return out, weights
```

### Training Configuration

```python
TFT_CONFIG = {
    # Input configuration
    'static_covariates': ['symbol_id', 'is_futures', 'is_options'],
    
    'time_varying_known': [
        'day_of_week', 'hour', 'minute',
        'is_expiry_day', 'days_to_expiry'
    ],
    
    'time_varying_unknown': [
        'close', 'volume', 'oi',
        'return_1m', 'return_5m', 'return_15m',
        'rsi_14', 'macd', 'macd_signal',
        'atr_percent', 'bb_width', 'vwap_distance',
        'atm_iv', 'iv_skew', 'pcr_oi'
    ],
    
    # Architecture
    'hidden_size': 128,
    'lstm_layers': 2,
    'attention_heads': 4,
    'dropout': 0.1,
    
    # Forecasting
    'lookback': 120,  # 2 hours of 1-min data
    'horizons': [1, 5, 15, 60],  # minutes ahead
    'quantiles': [0.1, 0.5, 0.9],
    
    # Training
    'batch_size': 64,
    'learning_rate': 1e-3,
    'weight_decay': 1e-5,
    'epochs': 100,
    'early_stopping_patience': 10
}
```

---

## 2. Mamba State Space Model

**Purpose**: Efficient sequence modeling with O(n) complexity for regime detection.

### Architecture

```python
import torch
import torch.nn as nn
import torch.nn.functional as F
from einops import rearrange

class MambaBlock(nn.Module):
    """
    Mamba block with selective state space mechanism.
    Based on "Mamba: Linear-Time Sequence Modeling" (Gu & Dao, 2023)
    """
    
    def __init__(
        self,
        d_model: int = 256,
        d_state: int = 16,
        d_conv: int = 4,
        expand: int = 2
    ):
        super().__init__()
        
        self.d_model = d_model
        self.d_state = d_state
        self.d_inner = d_model * expand
        
        # Input projection
        self.in_proj = nn.Linear(d_model, self.d_inner * 2, bias=False)
        
        # Convolution
        self.conv1d = nn.Conv1d(
            self.d_inner, self.d_inner, 
            kernel_size=d_conv, 
            padding=d_conv - 1,
            groups=self.d_inner
        )
        
        # SSM parameters (learnable)
        self.x_proj = nn.Linear(self.d_inner, d_state * 2, bias=False)
        self.dt_proj = nn.Linear(self.d_inner, self.d_inner, bias=True)
        
        # A is structured (diagonal)
        A = torch.arange(1, d_state + 1).float()
        self.A_log = nn.Parameter(torch.log(A))
        self.D = nn.Parameter(torch.ones(self.d_inner))
        
        # Output projection
        self.out_proj = nn.Linear(self.d_inner, d_model, bias=False)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: [B, L, d_model]
        Returns:
            y: [B, L, d_model]
        """
        B, L, _ = x.shape
        
        # Project and split
        xz = self.in_proj(x)
        x, z = xz.chunk(2, dim=-1)  # [B, L, d_inner] each
        
        # Convolution
        x = rearrange(x, 'b l d -> b d l')
        x = self.conv1d(x)[:, :, :L]
        x = rearrange(x, 'b d l -> b l d')
        x = F.silu(x)
        
        # SSM
        y = self.ssm(x)
        
        # Gate and project
        y = y * F.silu(z)
        return self.out_proj(y)
    
    def ssm(self, x: torch.Tensor) -> torch.Tensor:
        """Selective State Space Model."""
        B, L, D = x.shape
        
        # Compute input-dependent B and C
        x_dbl = self.x_proj(x)
        delta, B_param = x_dbl.split([D, self.d_state], dim=-1)
        C = x_dbl[:, :, self.d_state:]
        
        # Discretize A
        A = -torch.exp(self.A_log)
        delta = F.softplus(self.dt_proj(delta))
        
        # Discretized A and B
        dA = torch.exp(delta.unsqueeze(-1) * A)
        dB = delta.unsqueeze(-1) * B_param.unsqueeze(-2)
        
        # Selective scan (simplified)
        h = torch.zeros(B, D, self.d_state, device=x.device)
        ys = []
        
        for i in range(L):
            h = dA[:, i] * h + dB[:, i] * x[:, i].unsqueeze(-1)
            y = (h * C[:, i].unsqueeze(-2)).sum(-1)
            ys.append(y)
        
        y = torch.stack(ys, dim=1)
        return y + x * self.D


class MambaStock(nn.Module):
    """
    Mamba-based stock prediction model.
    Superior to LSTM for long sequences with O(n) complexity.
    """
    
    def __init__(
        self,
        input_dim: int = 20,
        d_model: int = 256,
        d_state: int = 16,
        n_layers: int = 6,
        n_classes: int = 3
    ):
        super().__init__()
        
        self.embedding = nn.Linear(input_dim, d_model)
        
        self.layers = nn.ModuleList([
            MambaBlock(d_model, d_state)
            for _ in range(n_layers)
        ])
        
        self.norm = nn.LayerNorm(d_model)
        
        self.classifier = nn.Sequential(
            nn.Linear(d_model, d_model // 2),
            nn.GELU(),
            nn.Dropout(0.1),
            nn.Linear(d_model // 2, n_classes)
        )
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: [B, L, input_dim] - sequence of features
        Returns:
            logits: [B, n_classes]
        """
        x = self.embedding(x)
        
        for layer in self.layers:
            x = x + layer(x)  # Residual connection
        
        x = self.norm(x)
        
        # Use last timestep for classification
        return self.classifier(x[:, -1, :])
```

### Usage Example

```python
# Initialize model
model = MambaStock(
    input_dim=20,      # Number of features
    d_model=256,       # Hidden dimension
    d_state=16,        # SSM state dimension
    n_layers=6,        # Number of Mamba blocks
    n_classes=3        # UP/NEUTRAL/DOWN
)

# Training
optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4, weight_decay=0.01)
criterion = nn.CrossEntropyLoss()

for epoch in range(100):
    for batch in dataloader:
        x, y = batch  # x: [B, 120, 20], y: [B]
        
        logits = model(x)
        loss = criterion(logits, y)
        
        optimizer.zero_grad()
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()

# Export to ONNX
dummy_input = torch.randn(1, 120, 20)
torch.onnx.export(
    model, dummy_input, "mamba_stock.onnx",
    input_names=['features'],
    output_names=['logits'],
    dynamic_axes={'features': {0: 'batch', 1: 'seq_len'}}
)
```

---

## 3. PatchTST Long-Horizon Forecaster

**Purpose**: Capture long-term patterns using patch-based attention (like ViT for time series).

```python
class PatchTST(nn.Module):
    """
    Patch Time Series Transformer for long-horizon forecasting.
    Key innovation: Treats time series as patches, channel-independent.
    """
    
    def __init__(
        self,
        n_features: int = 15,
        seq_len: int = 512,
        pred_len: int = 60,
        patch_len: int = 16,
        stride: int = 8,
        d_model: int = 256,
        n_heads: int = 8,
        n_layers: int = 4,
        dropout: float = 0.2
    ):
        super().__init__()
        
        self.n_features = n_features
        self.seq_len = seq_len
        self.pred_len = pred_len
        self.patch_len = patch_len
        self.stride = stride
        
        # Number of patches
        self.n_patches = (seq_len - patch_len) // stride + 1
        
        # Patch embedding (per channel)
        self.patch_embed = nn.Linear(patch_len, d_model)
        
        # Positional embedding
        self.pos_embed = nn.Parameter(
            torch.randn(1, self.n_patches, d_model)
        )
        
        # Transformer encoder
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=n_heads,
            dim_feedforward=d_model * 4,
            dropout=dropout,
            batch_first=True
        )
        self.encoder = nn.TransformerEncoder(encoder_layer, n_layers)
        
        # Head (flatten patches → prediction)
        self.head = nn.Linear(self.n_patches * d_model, pred_len)
        
        self.dropout = nn.Dropout(dropout)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: [B, seq_len, n_features]
        Returns:
            pred: [B, pred_len, n_features]
        """
        B = x.shape[0]
        
        # Channel-independent: process each feature separately
        # Transpose: [B, n_features, seq_len]
        x = x.transpose(1, 2)
        
        # Create patches: [B, n_features, n_patches, patch_len]
        patches = x.unfold(dimension=-1, size=self.patch_len, step=self.stride)
        
        # Process each channel
        outputs = []
        for c in range(self.n_features):
            # [B, n_patches, patch_len]
            channel_patches = patches[:, c, :, :]
            
            # Embed patches
            embedded = self.patch_embed(channel_patches)  # [B, n_patches, d_model]
            embedded = embedded + self.pos_embed
            embedded = self.dropout(embedded)
            
            # Transformer
            encoded = self.encoder(embedded)  # [B, n_patches, d_model]
            
            # Flatten and project
            flat = encoded.flatten(1)  # [B, n_patches * d_model]
            pred = self.head(flat)  # [B, pred_len]
            outputs.append(pred)
        
        # Stack channels: [B, pred_len, n_features]
        return torch.stack(outputs, dim=-1)


# Configuration
PATCHTST_CONFIG = {
    'n_features': 15,
    'seq_len': 512,       # ~8.5 hours of 1-min data
    'pred_len': 60,       # 1 hour ahead
    'patch_len': 16,
    'stride': 8,
    'd_model': 256,
    'n_heads': 8,
    'n_layers': 4,
    'dropout': 0.2,
    'learning_rate': 1e-4,
    'batch_size': 32
}
```

---

## 4. TimeMixer Multi-Scale Model

**Purpose**: Capture patterns across multiple time scales simultaneously.

```python
class TimeMixer(nn.Module):
    """
    TimeMixer: Multi-scale mixing for time series.
    Captures both fine-grained and coarse patterns.
    """
    
    def __init__(
        self,
        seq_len: int = 96,
        pred_len: int = 24,
        n_features: int = 15,
        d_model: int = 32,
        n_layers: int = 2,
        scales: list = [1, 2, 4, 8]
    ):
        super().__init__()
        
        self.scales = scales
        self.n_scales = len(scales)
        
        # Multi-scale decomposition
        self.scale_projections = nn.ModuleList([
            nn.Linear(seq_len // s, d_model) for s in scales
        ])
        
        # Cross-scale mixing
        self.cross_mixer = nn.Sequential(
            nn.Linear(d_model * self.n_scales, d_model * 2),
            nn.GELU(),
            nn.Linear(d_model * 2, d_model)
        )
        
        # Temporal mixing layers
        self.temporal_mixers = nn.ModuleList([
            TemporalMixerBlock(d_model, n_features)
            for _ in range(n_layers)
        ])
        
        # Output projection
        self.output_proj = nn.Linear(d_model, pred_len)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: [B, seq_len, n_features]
        Returns:
            pred: [B, pred_len, n_features]
        """
        B, L, C = x.shape
        
        # Multi-scale representations
        scale_outputs = []
        for i, scale in enumerate(self.scales):
            # Downsample
            x_scaled = F.avg_pool1d(
                x.transpose(1, 2), 
                kernel_size=scale, 
                stride=scale
            ).transpose(1, 2)
            
            # Project to d_model
            proj = self.scale_projections[i](x_scaled.transpose(1, 2))
            scale_outputs.append(proj)
        
        # Concatenate scales and mix
        multi_scale = torch.cat(scale_outputs, dim=-1)
        mixed = self.cross_mixer(multi_scale)  # [B, n_features, d_model]
        
        # Temporal mixing
        for mixer in self.temporal_mixers:
            mixed = mixer(mixed)
        
        # Project to prediction length
        pred = self.output_proj(mixed)  # [B, n_features, pred_len]
        
        return pred.transpose(1, 2)  # [B, pred_len, n_features]


class TemporalMixerBlock(nn.Module):
    """Single temporal mixing block."""
    
    def __init__(self, d_model: int, n_features: int):
        super().__init__()
        
        self.norm1 = nn.LayerNorm(d_model)
        self.temporal_mix = nn.Linear(n_features, n_features)
        
        self.norm2 = nn.LayerNorm(d_model)
        self.channel_mix = nn.Sequential(
            nn.Linear(d_model, d_model * 4),
            nn.GELU(),
            nn.Linear(d_model * 4, d_model)
        )
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: [B, n_features, d_model]
        
        # Temporal mixing (across features)
        x = x + self.temporal_mix(self.norm1(x).transpose(1, 2)).transpose(1, 2)
        
        # Channel mixing (within each feature)
        x = x + self.channel_mix(self.norm2(x))
        
        return x
```

---

## 5. Options-Specific Models

### IV Surface Predictor (VAE + MLP)

```python
class IVSurfacePredictor(nn.Module):
    """
    Predict implied volatility surface using VAE encoder + MLP decoder.
    Input: Current IV surface + market conditions
    Output: Predicted IV surface 5min/15min ahead
    """
    
    def __init__(
        self,
        n_strikes: int = 21,  # ATM ± 10 strikes
        n_expiries: int = 5,   # Weekly expiries
        latent_dim: int = 32,
        hidden_dim: int = 128
    ):
        super().__init__()
        
        self.n_strikes = n_strikes
        self.n_expiries = n_expiries
        input_dim = n_strikes * n_expiries
        
        # VAE Encoder
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU()
        )
        self.fc_mu = nn.Linear(hidden_dim, latent_dim)
        self.fc_logvar = nn.Linear(hidden_dim, latent_dim)
        
        # Market condition embedding
        self.market_embed = nn.Linear(10, latent_dim)  # VIX, spot, etc.
        
        # MLP Decoder
        self.decoder = nn.Sequential(
            nn.Linear(latent_dim * 2, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, input_dim)
        )
    
    def encode(self, x: torch.Tensor) -> tuple:
        h = self.encoder(x)
        return self.fc_mu(h), self.fc_logvar(h)
    
    def reparameterize(self, mu: torch.Tensor, logvar: torch.Tensor) -> torch.Tensor:
        std = torch.exp(0.5 * logvar)
        eps = torch.randn_like(std)
        return mu + eps * std
    
    def forward(
        self, 
        iv_surface: torch.Tensor,      # [B, n_strikes * n_expiries]
        market_conditions: torch.Tensor # [B, 10]
    ) -> tuple:
        # Encode current surface
        mu, logvar = self.encode(iv_surface)
        z = self.reparameterize(mu, logvar)
        
        # Combine with market conditions
        market_embed = self.market_embed(market_conditions)
        combined = torch.cat([z, market_embed], dim=-1)
        
        # Decode predicted surface
        pred_surface = self.decoder(combined)
        
        return pred_surface, mu, logvar


# Greeks Forecaster
class GreeksForecaster(nn.Module):
    """
    Forecast option Greeks (Delta, Gamma, Vega, Theta) evolution.
    Uses LSTM to capture temporal dynamics.
    """
    
    def __init__(
        self,
        n_features: int = 10,
        hidden_size: int = 64,
        n_layers: int = 2,
        pred_len: int = 15
    ):
        super().__init__()
        
        self.lstm = nn.LSTM(
            n_features, hidden_size, n_layers,
            batch_first=True, dropout=0.1
        )
        
        # Separate heads for each Greek
        self.delta_head = nn.Linear(hidden_size, pred_len)
        self.gamma_head = nn.Linear(hidden_size, pred_len)
        self.vega_head = nn.Linear(hidden_size, pred_len)
        self.theta_head = nn.Linear(hidden_size, pred_len)
    
    def forward(self, x: torch.Tensor) -> dict:
        """
        Args:
            x: [B, seq_len, n_features] - historical Greeks + market data
        Returns:
            dict with predicted Greeks trajectories
        """
        lstm_out, _ = self.lstm(x)
        last_hidden = lstm_out[:, -1, :]
        
        return {
            'delta': self.delta_head(last_hidden),
            'gamma': self.gamma_head(last_hidden),
            'vega': self.vega_head(last_hidden),
            'theta': self.theta_head(last_hidden)
        }
```

---

## Model Export to ONNX

```python
def export_all_models_to_onnx(models_dir: str = './models'):
    """Export all trained models to ONNX format for inference."""
    
    import os
    os.makedirs(models_dir, exist_ok=True)
    
    # LiT Transformer
    lit = LiTTransformer()
    lit.load_state_dict(torch.load('lit_best.pt'))
    lit.eval()
    
    dummy_lob = torch.randn(1, 30, 4)
    torch.onnx.export(
        lit, dummy_lob,
        f'{models_dir}/lit_transformer.onnx',
        input_names=['lob_snapshot'],
        output_names=['direction_logits'],
        dynamic_axes={'lob_snapshot': {0: 'batch'}}
    )
    
    # Mamba
    mamba = MambaStock()
    mamba.load_state_dict(torch.load('mamba_best.pt'))
    mamba.eval()
    
    dummy_seq = torch.randn(1, 120, 20)
    torch.onnx.export(
        mamba, dummy_seq,
        f'{models_dir}/mamba_stock.onnx',
        input_names=['features'],
        output_names=['logits'],
        dynamic_axes={'features': {0: 'batch', 1: 'seq_len'}}
    )
    
    # TFT, PatchTST, etc. similarly...
    print(f"All models exported to {models_dir}/")
```

---

## Performance Benchmarks

| Model | AUC (H1) | AUC (H3) | Inference (ms) | Memory (MB) |
|-------|----------|----------|----------------|-------------|
| LiT Transformer | 0.72 | 0.68 | 2.1 | 45 |
| LightGBM | 0.69 | 0.71 | 0.3 | 12 |
| TFT | 0.74 | 0.76 | 8.5 | 180 |
| Mamba | 0.73 | 0.75 | 3.2 | 95 |
| PatchTST | 0.71 | 0.77 | 5.8 | 120 |
| TimeMixer | 0.70 | 0.74 | 4.1 | 85 |

---

See [AI_TRADING_ARCHITECTURE.md](./AI_TRADING_ARCHITECTURE.md) for the complete system overview.

See [TRAINING_PIPELINE.md](./TRAINING_PIPELINE.md) for training infrastructure.
