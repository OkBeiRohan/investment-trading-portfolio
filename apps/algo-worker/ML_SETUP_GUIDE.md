# AI/ML Model Setup Guide for algo-worker

This guide provides comprehensive instructions for setting up the machine learning models for the algorithmic trading system.

## Overview

The algo-worker uses a **Hybrid Stack Ensemble** approach with 4 Level-0 models and 1 Level-1 meta-learner:

**Level-0 Models:**

1. **XGBoost Classifier** - Gradient boosting for tabular data
2. **CNN-LSTM Hybrid** - Deep learning for sequence patterns
3. **GARCH-Informed Neural Network (GINN)** - Statistical + ML hybrid
4. **Support Vector Machine (SVM)** - High economic gain classifier

**Level-1 Model:**

- **Logistic Regression** - Stacking meta-learner

**Target Variable:**

```
Y = Binary Classification:
  1: India VIX (or ATM IV) will be HIGHER in next 4 hours
  0: India VIX (or ATM IV) will be LOWER in next 4 hours
```

---

## Prerequisites

### System Requirements

- **Python**: 3.10 or 3.11 (3.12 not recommended due to some package compatibility)
- **RAM**: Minimum 16GB (32GB recommended for training)
- **Storage**: 20GB for data and models
- **GPU**: Optional but recommended (CUDA-enabled NVIDIA GPU for faster training)

### Operating System

- Linux (Ubuntu 20.04/22.04 recommended)
- macOS (Intel or Apple Silicon)
- Windows (with WSL2 recommended)

---

## Step 1: Python Environment Setup

### Option A: Using Conda (Recommended)

```bash
# Install Miniconda (if not already installed)
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
bash Miniconda3-latest-Linux-x86_64.sh

# Create environment
conda create -n algo-trading python=3.11 -y
conda activate algo-trading

# Verify Python version
python --version  # Should show Python 3.11.x
```

### Option B: Using venv

```bash
# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Upgrade pip
pip install --upgrade pip setuptools wheel
```

---

## Step 2: Install Core Dependencies

Create a `requirements.txt` file in the project root:

```txt
# Core Data Science Stack
numpy==1.26.4
pandas==2.2.3
scipy==1.14.1
scikit-learn==1.5.2

# XGBoost
xgboost==2.1.3

# Deep Learning (TensorFlow/Keras)
tensorflow==2.17.1  # Use 2.15.0 for CPU-only
keras==3.6.0

# SVM and Statistical Models
arch==7.2.0  # For GARCH models
statsmodels==0.14.4

# Model Persistence
joblib==1.4.2
h5py==3.12.1

# Data Handling
ta==0.11.0  # Technical analysis indicators
yfinance==0.2.50  # Historical data

# Visualization (optional but useful)
matplotlib==3.9.3
seaborn==0.13.2

# MongoDB for model registry
pymongo==4.10.1

# Jupyter for experiments (optional)
jupyter==1.1.1
ipykernel==6.29.5

# Progress bars
tqdm==4.67.1

# Configuration
python-dotenv==1.0.1
pyyaml==6.0.2
```

Install all dependencies:

```bash
pip install -r requirements.txt
```

### GPU Support (Optional but Recommended)

If you have an NVIDIA GPU with CUDA:

```bash
# TensorFlow with GPU support
pip install tensorflow[and-cuda]==2.17.1

# Verify GPU availability
python -c "import tensorflow as tf; print('GPU Available:', tf.config.list_physical_devices('GPU'))"
```

---

## Step 3: Project Structure for ML Models

Create the following structure in `apps/algo-worker/`:

```bash
apps/algo-worker/
├── ml/
│   ├── __init__.py
│   ├── data/
│   │   ├── __init__.py
│   │   ├── loader.py           # Data loading from MongoDB/CSV
│   │   ├── preprocessor.py     # Feature engineering
│   │   └── validator.py        # Data quality checks
│   ├── models/
│   │   ├── __init__.py
│   │   ├── xgboost_model.py    # XGBoost implementation
│   │   ├── cnn_lstm_model.py   # CNN-LSTM hybrid
│   │   ├── ginn_model.py       # GARCH-Informed NN
│   │   ├── svm_model.py        # Support Vector Machine
│   │   └── stacking.py         # Meta-learner
│   ├── training/
│   │   ├── __init__.py
│   │   ├── trainer.py          # Training orchestrator
│   │   ├── walk_forward.py     # Walk-forward validation
│   │   └── hyperparameter.py   # Hyperparameter tuning
│   ├── evaluation/
│   │   ├── __init__.py
│   │   ├── metrics.py          # Sharpe, Sortino, etc.
│   │   └── backtester.py       # Backtesting engine
│   ├── config/
│   │   ├── model_config.yaml   # Model hyperparameters
│   │   └── feature_config.yaml # Feature definitions
│   └── notebooks/
│       ├── 01_data_exploration.ipynb
│       ├── 02_feature_engineering.ipynb
│       ├── 03_model_training.ipynb
│       └── 04_backtesting.ipynb
└── trained_models/              # Saved models directory
    ├── xgboost/
    ├── cnn_lstm/
    ├── ginn/
    ├── svm/
    └── stacking/
```

---

## Step 4: Data Preparation

### 4.1 Historical Data Sources

**For Training (Historical Data):**

1. **Nifty 50 Index Data**: Use `yfinance` for basic OHLCV

```python
import yfinance as yf

nifty = yf.Ticker("^NSEI")
hist = nifty.history(start="2020-01-01", end="2024-11-17", interval="1h")
hist.to_csv("data/nifty_1h.csv")
```

2. **India VIX Data**: Available from NSE website or yfinance

```python
vix = yf.Ticker("^INDIAVIX")
vix_data = vix.history(start="2020-01-01", end="2024-11-17", interval="1d")
```

3. **Option Chain Data** (Critical but harder to get):
   - **Challenge**: Historical option chain data (Greeks, IV, OI) is not free
   - **Solutions**:
     a. **Paid Vendors**: TrueData, Algomojo, QuantInsti (recommended)
     b. **NSE Historical Data**: Limited free historical data
     c. **Start Collecting Now**: Use Upstox API to collect live data going forward

### 4.2 Feature Matrix Creation

Create `apps/algo-worker/ml/data/preprocessor.py`:

```python
import pandas as pd
import numpy as np
from ta.volatility import BollingerBands
from ta.momentum import RSIIndicator
from ta.trend import MACD

class FeatureEngineer:
    """
    Generate all required features for the ML models
    """

    def __init__(self):
        pass

    def calculate_realized_volatility(self, returns: pd.Series, window: int) -> pd.Series:
        """Calculate rolling realized volatility"""
        return returns.rolling(window=window).std() * np.sqrt(252)

    def generate_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Generate complete feature matrix

        Args:
            df: DataFrame with columns ['timestamp', 'open', 'high', 'low', 'close', 'volume']

        Returns:
            DataFrame with all features
        """
        features = df.copy()

        # Calculate returns
        features['returns'] = features['close'].pct_change()

        # 1. Realized Volatility Features
        features['realized_vol_5d'] = self.calculate_realized_volatility(features['returns'], 5)
        features['realized_vol_10d'] = self.calculate_realized_volatility(features['returns'], 10)
        features['realized_vol_20d'] = self.calculate_realized_volatility(features['returns'], 20)

        # 2. RSI
        rsi = RSIIndicator(features['close'], window=14)
        features['rsi_14'] = rsi.rsi()

        # 3. MACD
        macd = MACD(features['close'])
        features['macd'] = macd.macd()
        features['macd_signal'] = macd.macd_signal()
        features['macd_diff'] = macd.macd_diff()

        # 4. Moving Average Crossovers
        features['sma_20'] = features['close'].rolling(window=20).mean()
        features['sma_50'] = features['close'].rolling(window=50).mean()
        features['ma_cross'] = (features['sma_20'] > features['sma_50']).astype(int)

        # 5. Bollinger Bands
        bb = BollingerBands(features['close'])
        features['bb_high'] = bb.bollinger_hband()
        features['bb_low'] = bb.bollinger_lband()
        features['bb_width'] = features['bb_high'] - features['bb_low']

        # 6. Volume features
        features['volume_ma_20'] = features['volume'].rolling(window=20).mean()
        features['volume_ratio'] = features['volume'] / features['volume_ma_20']

        # Drop NaN values
        features = features.dropna()

        return features

    def create_target_variable(self, df: pd.DataFrame, horizon: int = 16) -> pd.Series:
        """
        Create target variable: Will VIX/IV be higher in next 'horizon' periods?

        Args:
            df: DataFrame with 'india_vix' or 'atm_iv' column
            horizon: Number of periods ahead (16 periods = 4 hours for 15-min data)

        Returns:
            Binary target (1 = higher, 0 = lower)
        """
        if 'india_vix' in df.columns:
            vol_col = 'india_vix'
        elif 'atm_iv' in df.columns:
            vol_col = 'atm_iv'
        else:
            raise ValueError("Need 'india_vix' or 'atm_iv' column")

        # Future volatility (shifted backwards)
        future_vol = df[vol_col].shift(-horizon)
        current_vol = df[vol_col]

        # Target: 1 if future vol > current vol
        target = (future_vol > current_vol).astype(int)

        return target
```

### 4.3 Data Quality Checks

Create `apps/algo-worker/ml/data/validator.py`:

```python
import pandas as pd
import numpy as np

class DataValidator:
    """
    Ensure data quality and detect anomalies
    """

    @staticmethod
    def check_missing_data(df: pd.DataFrame, max_missing_pct: float = 0.05):
        """Check for missing data"""
        missing = df.isnull().sum() / len(df)
        problematic = missing[missing > max_missing_pct]

        if len(problematic) > 0:
            print(f"Warning: Columns with >{max_missing_pct*100}% missing:")
            print(problematic)

        return missing

    @staticmethod
    def detect_outliers(df: pd.DataFrame, columns: list, n_sigma: float = 3.0):
        """Detect outliers using z-score"""
        outliers = {}

        for col in columns:
            mean = df[col].mean()
            std = df[col].std()
            z_scores = np.abs((df[col] - mean) / std)
            outlier_mask = z_scores > n_sigma

            outliers[col] = df[outlier_mask].index.tolist()

            if len(outliers[col]) > 0:
                print(f"{col}: Found {len(outliers[col])} outliers")

        return outliers

    @staticmethod
    def check_temporal_integrity(df: pd.DataFrame, timestamp_col: str = 'timestamp'):
        """Ensure no look-ahead bias - timestamps are monotonically increasing"""
        if not df[timestamp_col].is_monotonic_increasing:
            raise ValueError("Timestamps are not monotonically increasing! Look-ahead bias risk.")

        print("✓ Temporal integrity verified")
```

---

## Step 5: Model Implementation

### 5.1 XGBoost Model

Create `apps/algo-worker/ml/models/xgboost_model.py`:

```python
import xgboost as xgb
from sklearn.model_selection import train_test_split
import joblib
import numpy as np

class XGBoostVolatilityClassifier:
    """
    XGBoost classifier for volatility prediction
    """

    def __init__(self, hyperparams: dict = None):
        default_params = {
            'max_depth': 6,
            'learning_rate': 0.01,
            'n_estimators': 500,
            'objective': 'binary:logistic',
            'eval_metric': 'logloss',
            'tree_method': 'hist',  # Faster for large datasets
            'random_state': 42,
            'early_stopping_rounds': 50,
        }

        self.params = {**default_params, **(hyperparams or {})}
        self.model = None
        self.feature_importance = None

    def train(self, X_train, y_train, X_val, y_val):
        """Train XGBoost model"""
        self.model = xgb.XGBClassifier(**self.params)

        self.model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            verbose=50
        )

        # Store feature importance
        self.feature_importance = self.model.feature_importances_

        return self

    def predict_proba(self, X):
        """Predict probability"""
        if self.model is None:
            raise ValueError("Model not trained yet")
        return self.model.predict_proba(X)[:, 1]

    def get_feature_importance(self, feature_names: list, top_n: int = 10):
        """Get top N important features"""
        if self.feature_importance is None:
            raise ValueError("Model not trained yet")

        importance_df = pd.DataFrame({
            'feature': feature_names,
            'importance': self.feature_importance
        }).sort_values('importance', ascending=False)

        return importance_df.head(top_n)

    def save(self, path: str):
        """Save model"""
        joblib.dump(self.model, path)

    @classmethod
    def load(cls, path: str):
        """Load model"""
        instance = cls()
        instance.model = joblib.load(path)
        return instance
```

### 5.2 CNN-LSTM Hybrid

Create `apps/algo-worker/ml/models/cnn_lstm_model.py`:

```python
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import numpy as np

class CNNLSTMVolatilityClassifier:
    """
    CNN-LSTM hybrid for sequence pattern recognition
    """

    def __init__(self, sequence_length: int = 60, n_features: int = 20):
        self.sequence_length = sequence_length
        self.n_features = n_features
        self.model = None
        self.history = None

    def build_model(self):
        """Build CNN-LSTM architecture"""
        inputs = keras.Input(shape=(self.sequence_length, self.n_features))

        # 1D CNN layers
        x = layers.Conv1D(filters=64, kernel_size=3, activation='relu', padding='same')(inputs)
        x = layers.MaxPooling1D(pool_size=2)(x)
        x = layers.Conv1D(filters=32, kernel_size=3, activation='relu', padding='same')(x)
        x = layers.MaxPooling1D(pool_size=2)(x)

        # LSTM layers
        x = layers.LSTM(units=50, return_sequences=False)(x)
        x = layers.Dropout(0.3)(x)

        # Dense layers
        x = layers.Dense(32, activation='relu')(x)
        x = layers.Dropout(0.3)(x)
        outputs = layers.Dense(1, activation='sigmoid')(x)

        self.model = keras.Model(inputs=inputs, outputs=outputs)

        self.model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='binary_crossentropy',
            metrics=['accuracy', tf.keras.metrics.AUC()]
        )

        return self

    def train(self, X_train, y_train, X_val, y_val, epochs: int = 100, batch_size: int = 32):
        """Train CNN-LSTM model"""
        if self.model is None:
            self.build_model()

        early_stop = keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=10,
            restore_best_weights=True
        )

        reduce_lr = keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=1e-7
        )

        self.history = self.model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=[early_stop, reduce_lr],
            verbose=1
        )

        return self

    def predict_proba(self, X):
        """Predict probability"""
        if self.model is None:
            raise ValueError("Model not trained yet")
        return self.model.predict(X, verbose=0).flatten()

    def save(self, path: str):
        """Save model"""
        self.model.save(path)

    @classmethod
    def load(cls, path: str, sequence_length: int = 60, n_features: int = 20):
        """Load model"""
        instance = cls(sequence_length, n_features)
        instance.model = keras.models.load_model(path)
        return instance
```

### 5.3 GARCH-Informed Neural Network

Create `apps/algo-worker/ml/models/ginn_model.py`:

```python
from arch import arch_model
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

class GARCHInformedNN:
    """
    Two-stage model: GARCH(1,1) + LSTM on residuals
    """

    def __init__(self, sequence_length: int = 60):
        self.sequence_length = sequence_length
        self.garch_model = None
        self.lstm_model = None
        self.garch_forecasts = None

    def fit_garch(self, returns: np.ndarray):
        """Fit GARCH(1,1) model"""
        # Scale returns to percentage
        returns_pct = returns * 100

        # Fit GARCH(1,1)
        self.garch_model = arch_model(
            returns_pct,
            vol='Garch',
            p=1,
            q=1,
            dist='normal'
        )

        self.garch_fit = self.garch_model.fit(disp='off')

        # Get conditional volatility forecasts
        self.garch_forecasts = self.garch_fit.conditional_volatility

        return self

    def calculate_residuals(self, actual_vol: np.ndarray):
        """Calculate residuals: actual - GARCH forecast"""
        if self.garch_forecasts is None:
            raise ValueError("GARCH model not fitted yet")

        # Ensure same length
        min_len = min(len(actual_vol), len(self.garch_forecasts))
        actual = actual_vol[-min_len:]
        forecast = self.garch_forecasts[-min_len:]

        residuals = actual - forecast
        return residuals

    def build_lstm(self, n_features: int = 10):
        """Build LSTM to learn residual patterns"""
        inputs = keras.Input(shape=(self.sequence_length, n_features))

        x = layers.LSTM(units=50, return_sequences=True)(inputs)
        x = layers.Dropout(0.2)(x)
        x = layers.LSTM(units=30, return_sequences=False)(x)
        x = layers.Dropout(0.2)(x)
        x = layers.Dense(16, activation='relu')(x)
        outputs = layers.Dense(1, activation='sigmoid')(x)

        self.lstm_model = keras.Model(inputs=inputs, outputs=outputs)

        self.lstm_model.compile(
            optimizer='adam',
            loss='binary_crossentropy',
            metrics=['accuracy']
        )

        return self

    def train(self, returns: np.ndarray, actual_vol: np.ndarray,
              X_lstm: np.ndarray, y: np.ndarray, epochs: int = 50):
        """
        Two-stage training

        Args:
            returns: Return series for GARCH
            actual_vol: Actual volatility
            X_lstm: Features for LSTM (sequences)
            y: Target labels
        """
        # Stage 1: Fit GARCH
        print("Stage 1: Fitting GARCH(1,1)...")
        self.fit_garch(returns)

        # Stage 2: Train LSTM on patterns GARCH missed
        print("Stage 2: Training LSTM on residuals...")
        if self.lstm_model is None:
            self.build_lstm(n_features=X_lstm.shape[2])

        self.lstm_model.fit(
            X_lstm, y,
            epochs=epochs,
            batch_size=32,
            validation_split=0.2,
            verbose=1
        )

        return self

    def predict_proba(self, X_lstm: np.ndarray):
        """Predict using combined GARCH + LSTM"""
        lstm_probs = self.lstm_model.predict(X_lstm, verbose=0).flatten()
        return lstm_probs

    def save(self, garch_path: str, lstm_path: str):
        """Save both models"""
        # Save GARCH parameters
        import pickle
        with open(garch_path, 'wb') as f:
            pickle.dump(self.garch_fit, f)

        # Save LSTM
        self.lstm_model.save(lstm_path)

    @classmethod
    def load(cls, garch_path: str, lstm_path: str, sequence_length: int = 60):
        """Load both models"""
        import pickle
        instance = cls(sequence_length)

        # Load GARCH
        with open(garch_path, 'rb') as f:
            instance.garch_fit = pickle.load(f)

        # Load LSTM
        instance.lstm_model = keras.models.load_model(lstm_path)

        return instance
```

### 5.4 Support Vector Machine

Create `apps/algo-worker/ml/models/svm_model.py`:

```python
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import GridSearchCV
import joblib

class SVMVolatilityClassifier:
    """
    Support Vector Machine with RBF kernel
    Known for high economic gains despite sometimes lower accuracy
    """

    def __init__(self, hyperparams: dict = None):
        default_params = {
            'kernel': 'rbf',
            'C': 1.0,
            'gamma': 'scale',
            'probability': True,  # Enable probability estimates
            'random_state': 42,
        }

        self.params = {**default_params, **(hyperparams or {})}
        self.model = None
        self.scaler = StandardScaler()

    def train(self, X_train, y_train):
        """Train SVM model"""
        # SVM requires scaled features
        X_train_scaled = self.scaler.fit_transform(X_train)

        self.model = SVC(**self.params)
        self.model.fit(X_train_scaled, y_train)

        return self

    def hyperparameter_tuning(self, X_train, y_train, cv: int = 3):
        """Grid search for optimal hyperparameters"""
        param_grid = {
            'C': [0.1, 1, 10],
            'gamma': ['scale', 'auto', 0.1, 0.01],
        }

        X_train_scaled = self.scaler.fit_transform(X_train)

        grid_search = GridSearchCV(
            SVC(kernel='rbf', probability=True, random_state=42),
            param_grid,
            cv=cv,
            scoring='roc_auc',
            n_jobs=-1,
            verbose=2
        )

        grid_search.fit(X_train_scaled, y_train)

        print(f"Best parameters: {grid_search.best_params_}")
        print(f"Best score: {grid_search.best_score_:.4f}")

        self.model = grid_search.best_estimator_
        self.params.update(grid_search.best_params_)

        return self

    def predict_proba(self, X):
        """Predict probability"""
        if self.model is None:
            raise ValueError("Model not trained yet")

        X_scaled = self.scaler.transform(X)
        return self.model.predict_proba(X_scaled)[:, 1]

    def save(self, model_path: str, scaler_path: str):
        """Save model and scaler"""
        joblib.dump(self.model, model_path)
        joblib.dump(self.scaler, scaler_path)

    @classmethod
    def load(cls, model_path: str, scaler_path: str):
        """Load model and scaler"""
        instance = cls()
        instance.model = joblib.load(model_path)
        instance.scaler = joblib.load(scaler_path)
        return instance
```

### 5.5 Stacking Meta-Learner

Create `apps/algo-worker/ml/models/stacking.py`:

```python
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_predict
import numpy as np
import joblib

class StackingMetaLearner:
    """
    Level-1 meta-learner: Logistic Regression
    Combines predictions from all Level-0 models
    """

    def __init__(self):
        self.meta_model = LogisticRegression(
            max_iter=1000,
            random_state=42,
            solver='lbfgs'
        )
        self.model_names = ['xgboost', 'cnn_lstm', 'ginn', 'svm']

    def create_meta_features(self, l0_predictions: dict) -> np.ndarray:
        """
        Create meta-features from Level-0 model predictions

        Args:
            l0_predictions: Dict with keys ['xgboost', 'cnn_lstm', 'ginn', 'svm']
                           Each value is array of predicted probabilities

        Returns:
            Meta-feature matrix (n_samples, n_models)
        """
        meta_X = np.column_stack([
            l0_predictions['xgboost'],
            l0_predictions['cnn_lstm'],
            l0_predictions['ginn'],
            l0_predictions['svm']
        ])

        return meta_X

    def train(self, l0_predictions: dict, y_true: np.ndarray):
        """
        Train meta-learner on out-of-fold predictions from L0 models

        CRITICAL: l0_predictions must be out-of-fold predictions to avoid leakage!
        """
        meta_X = self.create_meta_features(l0_predictions)
        self.meta_model.fit(meta_X, y_true)

        # Print coefficients to see which models are trusted more
        coeffs = self.meta_model.coef_[0]
        for name, coef in zip(self.model_names, coeffs):
            print(f"{name} coefficient: {coef:.4f}")

        return self

    def predict_proba(self, l0_predictions: dict) -> np.ndarray:
        """
        Predict final probability using meta-learner
        """
        meta_X = self.create_meta_features(l0_predictions)
        return self.meta_model.predict_proba(meta_X)[:, 1]

    def predict(self, l0_predictions: dict, threshold: float = 0.5) -> np.ndarray:
        """
        Predict class labels
        """
        probs = self.predict_proba(l0_predictions)
        return (probs >= threshold).astype(int)

    def save(self, path: str):
        """Save meta-learner"""
        joblib.dump(self.meta_model, path)

    @classmethod
    def load(cls, path: str):
        """Load meta-learner"""
        instance = cls()
        instance.meta_model = joblib.load(path)
        return instance
```

---

## Step 6: Training Pipeline

Create `apps/algo-worker/ml/training/trainer.py`:

```python
import numpy as np
from sklearn.model_selection import TimeSeriesSplit
import pandas as pd

class ModelTrainer:
    """
    Orchestrates training of all models with proper cross-validation
    """

    def __init__(self, models: dict, data: pd.DataFrame):
        """
        Args:
            models: Dict with keys ['xgboost', 'cnn_lstm', 'ginn', 'svm', 'stacking']
            data: Prepared dataset with features and target
        """
        self.models = models
        self.data = data
        self.l0_oof_predictions = {}  # Out-of-fold predictions

    def train_l0_models_cv(self, X, y, n_splits: int = 5):
        """
        Train Level-0 models using Time Series Cross-Validation
        Generate out-of-fold predictions for stacking
        """
        tscv = TimeSeriesSplit(n_splits=n_splits)

        # Initialize OOF arrays
        for model_name in ['xgboost', 'cnn_lstm', 'ginn', 'svm']:
            self.l0_oof_predictions[model_name] = np.zeros(len(X))

        for fold, (train_idx, val_idx) in enumerate(tscv.split(X)):
            print(f"\n{'='*50}")
            print(f"Training Fold {fold + 1}/{n_splits}")
            print(f"{'='*50}")

            X_train, X_val = X[train_idx], X[val_idx]
            y_train, y_val = y[train_idx], y[val_idx]

            # Train each L0 model
            for model_name, model in self.models.items():
                if model_name == 'stacking':
                    continue

                print(f"\nTraining {model_name}...")

                if model_name == 'xgboost':
                    model.train(X_train, y_train, X_val, y_val)
                else:
                    model.train(X_train, y_train)

                # Get out-of-fold predictions
                oof_preds = model.predict_proba(X_val)
                self.l0_oof_predictions[model_name][val_idx] = oof_preds

                print(f"{model_name} trained ✓")

        return self

    def train_meta_learner(self, y):
        """
        Train stacking meta-learner on out-of-fold predictions
        """
        print("\n" + "="*50)
        print("Training Meta-Learner (Stacking)")
        print("="*50)

        stacking_model = self.models['stacking']
        stacking_model.train(self.l0_oof_predictions, y)

        print("Meta-learner trained ✓")

        return self

    def save_all_models(self, base_path: str = 'trained_models'):
        """Save all trained models"""
        import os
        os.makedirs(base_path, exist_ok=True)

        for model_name, model in self.models.items():
            model_dir = os.path.join(base_path, model_name)
            os.makedirs(model_dir, exist_ok=True)

            if model_name == 'xgboost':
                model.save(os.path.join(model_dir, 'model.pkl'))
            elif model_name == 'cnn_lstm':
                model.save(os.path.join(model_dir, 'model.h5'))
            elif model_name == 'ginn':
                model.save(
                    os.path.join(model_dir, 'garch.pkl'),
                    os.path.join(model_dir, 'lstm.h5')
                )
            elif model_name == 'svm':
                model.save(
                    os.path.join(model_dir, 'model.pkl'),
                    os.path.join(model_dir, 'scaler.pkl')
                )
            elif model_name == 'stacking':
                model.save(os.path.join(model_dir, 'model.pkl'))

        print(f"\nAll models saved to {base_path}/")
```

---

## Step 7: Complete Training Script

Create `apps/algo-worker/ml/train_models.py`:

```python
#!/usr/bin/env python3
"""
Complete training script for all models
Run this to train the ensemble from scratch
"""

import pandas as pd
import numpy as np
from ml.data.preprocessor import FeatureEngineer
from ml.data.validator import DataValidator
from ml.models.xgboost_model import XGBoostVolatilityClassifier
from ml.models.cnn_lstm_model import CNNLSTMVolatilityClassifier
from ml.models.ginn_model import GARCHInformedNN
from ml.models.svm_model import SVMVolatilityClassifier
from ml.models.stacking import StackingMetaLearner
from ml.training.trainer import ModelTrainer

def main():
    print("Starting Model Training Pipeline")
    print("="*60)

    # 1. Load data
    print("\n1. Loading data...")
    df = pd.read_csv('data/nifty_with_vix.csv')  # Your prepared dataset
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values('timestamp')

    # 2. Generate features
    print("\n2. Generating features...")
    feature_engineer = FeatureEngineer()
    df_features = feature_engineer.generate_features(df)

    # 3. Create target variable
    print("\n3. Creating target variable...")
    y = feature_engineer.create_target_variable(df_features, horizon=16)

    # Align features with target (drop last 16 rows without target)
    df_features = df_features.iloc[:-16]
    y = y.iloc[:-16]

    # 4. Data validation
    print("\n4. Validating data quality...")
    validator = DataValidator()
    validator.check_missing_data(df_features)
    validator.check_temporal_integrity(df_features)

    # 5. Prepare feature matrix
    feature_cols = [col for col in df_features.columns
                    if col not in ['timestamp', 'india_vix', 'atm_iv']]
    X = df_features[feature_cols].values
    y = y.values

    print(f"\nDataset shape: {X.shape}")
    print(f"Target distribution: {np.bincount(y)}")

    # 6. Initialize models
    print("\n6. Initializing models...")
    models = {
        'xgboost': XGBoostVolatilityClassifier(),
        'cnn_lstm': CNNLSTMVolatilityClassifier(
            sequence_length=60,
            n_features=len(feature_cols)
        ),
        'ginn': GARCHInformedNN(sequence_length=60),
        'svm': SVMVolatilityClassifier(),
        'stacking': StackingMetaLearner()
    }

    # 7. Train models
    print("\n7. Training models...")
    trainer = ModelTrainer(models, df_features)

    # Train L0 models with cross-validation
    trainer.train_l0_models_cv(X, y, n_splits=5)

    # Train meta-learner
    trainer.train_meta_learner(y)

    # 8. Save models
    print("\n8. Saving models...")
    trainer.save_all_models('trained_models')

    print("\n" + "="*60)
    print("Training Complete! ✓")
    print("="*60)

if __name__ == '__main__':
    main()
```

Run training:

```bash
cd apps/algo-worker
python ml/train_models.py
```

---

## Step 8: Model Inference in NestJS

After training, integrate models into NestJS for real-time inference. You'll need to:

1. **Save models to a shared location**
2. **Load models using Python child process or microservice**
3. **Call Python inference from TypeScript**

### Option A: Python Microservice (Recommended)

Create `apps/algo-worker/ml/inference_server.py`:

```python
from flask import Flask, request, jsonify
import numpy as np
# Import your trained models

app = Flask(__name__)

# Load models at startup
models = load_all_models('trained_models/')

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    features = np.array(data['features'])

    # Get L0 predictions
    l0_preds = {
        'xgboost': models['xgboost'].predict_proba(features),
        'cnn_lstm': models['cnn_lstm'].predict_proba(features),
        'ginn': models['ginn'].predict_proba(features),
        'svm': models['svm'].predict_proba(features)
    }

    # Get final prediction from stacking
    final_prob = models['stacking'].predict_proba(l0_preds)

    return jsonify({
        'probability': float(final_prob[0]),
        'prediction': 'VOL_UP' if final_prob[0] > 0.55 else 'VOL_DOWN',
        'confidence': float(final_prob[0]),
        'model_contributions': {k: float(v[0]) for k, v in l0_preds.items()}
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

Run inference server:

```bash
python ml/inference_server.py
```

Call from NestJS:

```typescript
// apps/algo-worker/src/engines/signal/signal-engine.service.ts
import axios from 'axios';

async generateSignal(features: number[]): Promise<SignalOutput> {
  const response = await axios.post('http://localhost:5000/predict', {
    features: features
  });

  return response.data;
}
```

---

## Next Steps

1. **Collect Real Data**: Start collecting live data from Upstox API immediately
2. **Backtest**: Implement walk-forward validation (see instruction document)
3. **Optimize**: Tune hyperparameters based on Sharpe Ratio
4. **Deploy**: Integrate inference into algo-worker SignalEngine
5. **Monitor**: Track model performance in production

## Resources

- **XGBoost Docs**: https://xgboost.readthedocs.io/
- **TensorFlow Keras**: https://keras.io/
- **ARCH (GARCH)**: https://arch.readthedocs.io/
- **Scikit-learn**: https://scikit-learn.org/

## Troubleshooting

**GPU Not Detected**:

```bash
pip install tensorflow[and-cuda]==2.17.1
python -c "import tensorflow as tf; print(tf.config.list_physical_devices('GPU'))"
```

**Memory Issues**:

- Reduce batch size
- Use gradient accumulation
- Process data in chunks

**Installation Errors**:

- Ensure Python 3.11 (not 3.12)
- Update pip: `pip install --upgrade pip`
- Use conda for complex dependencies

---

**You now have everything needed to train and deploy the ML models for algo-worker!**
