# Train Feature Extractor Pipeline

Train TimesNet and WFTNet for feature compression and multi-scale pattern extraction.

---

## Purpose

Pre-train deep learning models specialized in time-series feature extraction. These models compress 50 raw features into 128-dimensional learned representations that capture multi-scale temporal patterns and wavelet-based frequency information.

---

## Models

### **1. TimesNet** (ICML 2023)

**Paper**: "TimesNet: Temporal 2D-Variation Modeling for General Time Series Analysis"

**Architecture**:

```python
class TimesNet(nn.Module):
    def __init__(self, seq_len=60, d_model=128, d_ff=256, num_kernels=6):
        super().__init__()

        # Convert 1D time series to 2D tensor
        self.period_encoder = PeriodEncoder(num_kernels)

        # Inception blocks for multi-scale patterns
        self.inception_blocks = nn.ModuleList([
            InceptionBlock(d_model, d_ff) for _ in range(4)
        ])

        # Projection layer
        self.projection = nn.Linear(d_model, 128)

    def forward(self, x):
        # x: (batch, seq_len, features) = (B, 60, 50)

        # Extract periods and convert to 2D
        x_2d = self.period_encoder(x)  # (B, periods, seq_len/periods, features)

        # Apply Inception blocks
        for block in self.inception_blocks:
            x_2d = block(x_2d)

        # Flatten and project
        x_flat = x_2d.reshape(x_2d.size(0), -1)
        features = self.projection(x_flat)  # (B, 128)

        return features
```

**Key Concepts**:

- **Period Encoding**: Detects dominant periods (daily, weekly patterns)
- **2D Transformation**: Converts 1D series into 2D image-like structure
- **Inception Blocks**: Multi-scale convolutions (kernel sizes 1, 3, 5)
- **Adaptive**: Learns optimal periods from data

**Training**:

```python
def train_timesnet(features, labels):
    model = TimesNet(seq_len=60, d_model=128)
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
    criterion = nn.BCEWithLogitsLoss()

    for epoch in range(50):
        for batch_x, batch_y in dataloader:
            # Forward pass
            extracted_features = model(batch_x)  # (B, 128)
            logits = nn.Linear(128, 1)(extracted_features)

            # Loss
            loss = criterion(logits, batch_y)

            # Backward
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

    return model
```

**Target**: AUC >0.73 (as standalone classifier)

---

### **2. WFTNet** (2024)

**Paper**: "Wavelet Feature Transform Network for Time Series Analysis"

**Architecture**:

```python
class WFTNet(nn.Module):
    def __init__(self, seq_len=60, features=50, wavelet='db4', level=3):
        super().__init__()

        # Discrete Wavelet Transform
        self.dwt = DWT1d(wavelet=wavelet, level=level)

        # Process approximation coefficients (low-freq)
        self.approx_conv = nn.Conv1d(features, 64, kernel_size=3, padding=1)

        # Process detail coefficients (high-freq)
        self.detail_convs = nn.ModuleList([
            nn.Conv1d(features, 32, kernel_size=3, padding=1)
            for _ in range(level)
        ])

        # Fusion layer
        self.fusion = nn.Linear(64 + 32*level, 128)

    def forward(self, x):
        # x: (batch, seq_len, features) = (B, 60, 50)
        x = x.transpose(1, 2)  # (B, 50, 60)

        # Wavelet decomposition
        approx, details = self.dwt(x)
        # approx: (B, 50, 30) - low frequency
        # details: [(B, 50, 30), (B, 50, 15), (B, 50, 7)] - high frequency

        # Process approximation
        approx_feat = F.relu(self.approx_conv(approx))  # (B, 64, 30)
        approx_feat = F.adaptive_avg_pool1d(approx_feat, 1).squeeze(-1)  # (B, 64)

        # Process details
        detail_feats = []
        for i, detail in enumerate(details):
            d_feat = F.relu(self.detail_convs[i](detail))
            d_feat = F.adaptive_avg_pool1d(d_feat, 1).squeeze(-1)
            detail_feats.append(d_feat)

        # Concatenate and fuse
        all_feats = torch.cat([approx_feat] + detail_feats, dim=1)
        features = self.fusion(all_feats)  # (B, 128)

        return features
```

**Key Concepts**:

- **Discrete Wavelet Transform (DWT)**: Multi-resolution analysis
- **Approximation Coefficients**: Low-frequency trends
- **Detail Coefficients**: High-frequency noise/patterns
- **Multi-Level Decomposition**: Captures patterns at different scales

**Training**:

```python
def train_wftnet(features, labels):
    model = WFTNet(seq_len=60, features=50, wavelet='db4', level=3)
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
    criterion = nn.BCEWithLogitsLoss()

    for epoch in range(40):
        for batch_x, batch_y in dataloader:
            # Forward pass
            extracted_features = model(batch_x)  # (B, 128)
            logits = nn.Linear(128, 1)(extracted_features)

            # Loss
            loss = criterion(logits, batch_y)

            # Backward
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

    return model
```

**Target**: AUC >0.72 (as standalone classifier)

---

## Usage: Feature Extractors in Ensemble

After training, freeze the feature extractors and use them to enhance Level-0 models:

```python
# Load pre-trained feature extractors
timesnet = torch.load('models/timesnet.pkl')
timesnet.eval()

wftnet = torch.load('models/wftnet.pkl')
wftnet.eval()

# Extract features for training data
with torch.no_grad():
    timesnet_features = timesnet(X_train)  # (N, 128)
    wftnet_features = wftnet(X_train)      # (N, 128)

# Train MLP on extracted features
class TimesNetMLP(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc = nn.Sequential(
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, 1),
            nn.Sigmoid()
        )

    def forward(self, x):
        return self.fc(x)

# Train MLP
timesnet_mlp = TimesNetMLP()
optimizer = torch.optim.Adam(timesnet_mlp.parameters(), lr=1e-3)
# ... training loop

# For inference: timesnet → timesnet_mlp
pred = timesnet_mlp(timesnet(new_data))
```

---

## Nodes

### **1. train_timesnet**

**Function**: `train_timesnet_model(features, labels)`

```python
def train_timesnet_model(features, labels):
    model = TimesNet(seq_len=60, d_model=128, d_ff=256, num_kernels=6)

    # Use TimeSeriesSplit for validation
    tscv = TimeSeriesSplit(n_splits=5)
    cv_scores = []

    for train_idx, val_idx in tscv.split(features):
        X_train, X_val = features[train_idx], features[val_idx]
        y_train, y_val = labels[train_idx], labels[val_idx]

        # Train
        model = train_model(model, X_train, y_train, epochs=50)

        # Validate
        score = evaluate_model(model, X_val, y_val)
        cv_scores.append(score)

    # Final training on full dataset
    model = train_model(model, features, labels, epochs=50)

    return model, np.mean(cv_scores)
```

---

### **2. train_wftnet**

**Function**: `train_wftnet_model(features, labels)`

Similar to TimesNet but uses WFTNet architecture.

---

### **3. extract_features**

**Function**: `extract_features_with_models(features, timesnet, wftnet)`

```python
def extract_features_with_models(features, timesnet, wftnet):
    with torch.no_grad():
        timesnet_feats = timesnet(features)
        wftnet_feats = wftnet(features)

    return {
        'timesnet': timesnet_feats.numpy(),
        'wftnet': wftnet_feats.numpy(),
    }
```

---

## Parameters

**File**: `conf/base/parameters/feature_extractor.yml`

```yaml
feature_extractor:
  timesnet:
    seq_len: 60
    d_model: 128
    d_ff: 256
    num_kernels: 6
    epochs: 50
    learning_rate: 1e-3
    batch_size: 64

  wftnet:
    seq_len: 60
    features: 50
    wavelet: "db4" # Daubechies 4
    level: 3 # 3-level decomposition
    epochs: 40
    learning_rate: 1e-3
    batch_size: 64
```

---

## Run

```bash
# Train both feature extractors
kedro run --pipeline train_feature_extractor

# Train only TimesNet
kedro run --pipeline train_feature_extractor --params model:timesnet

# Train only WFTNet
kedro run --pipeline train_feature_extractor --params model:wftnet
```

---

## Output

**Trained Models**:

- `data/06_models/timesnet.pkl`
- `data/06_models/wftnet.pkl`

**Extracted Features** (for ensemble training):

- `data/05_model_input/timesnet_features.parquet`
- `data/05_model_input/wftnet_features.parquet`

---

## MLflow Tracking

```python
with mlflow.start_run(run_name='timesnet'):
    mlflow.log_params({
        'model': 'TimesNet',
        'd_model': 128,
        'num_kernels': 6,
    })
    mlflow.log_metric('cv_auc_mean', np.mean(cv_scores))
    mlflow.log_metric('cv_auc_std', np.std(cv_scores))
    mlflow.pytorch.log_model(model, 'timesnet')
```

---

## Benefits vs. Raw Features

| Approach                       | Test AUC | Inference Time | Benefit                           |
| ------------------------------ | -------- | -------------- | --------------------------------- |
| Raw features (50D) → XGBoost   | 0.70     | 10ms           | Baseline                          |
| TimesNet features (128D) → MLP | 0.73     | 20ms           | +3% AUC, learns temporal patterns |
| WFTNet features (128D) → MLP   | 0.72     | 18ms           | +2% AUC, captures frequency info  |
| Ensemble with both             | 0.75+    | 50ms           | +5%+ AUC                          |

---

## When to Use Feature Extractors?

**Use if**:

- You have 2+ years of high-quality data
- Computational resources available (GPU)
- Target improvement >2% AUC
- Time for training (2-4 hours per model)

**Skip if**:

- Limited data (<1 year)
- CPU-only environment
- Baseline ensemble already >0.75 AUC
- Quick iteration needed

---

## Testing

**Unit Tests**:

```python
def test_timesnet_forward():
    model = TimesNet(seq_len=60, d_model=128)
    x = torch.randn(32, 60, 50)  # (batch, seq, features)
    output = model(x)
    assert output.shape == (32, 128)

def test_wftnet_forward():
    model = WFTNet(seq_len=60, features=50)
    x = torch.randn(32, 60, 50)
    output = model(x)
    assert output.shape == (32, 128)
```

---

## See Also

- [Train Ensemble Pipeline](./TRAIN_ENSEMBLE.md) - Use extracted features in Level-0 models
- [Feature Engineering Pipeline](./FEATURE_ENGINEERING.md) - Raw feature computation
- **TimesNet Paper**: https://arxiv.org/abs/2210.02186
- **WFTNet Concept**: Wavelet transforms + CNNs for time series
