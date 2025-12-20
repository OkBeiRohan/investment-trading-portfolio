# Backtesting Pipeline

Simulate trading with realistic transaction costs to evaluate strategy performance.

---

## Purpose

Test trained ensemble model on historical data with realistic NSE options transaction costs, slippage, and market impact. Generate performance metrics (Sharpe, Sortino, Max Drawdown, Win Rate).

---

## Transaction Costs (NSE Options)

### **1. Brokerage**

- **Flat Fee**: ₹20 per order (both entry and exit)

### **2. STT (Securities Transaction Tax)**

- **Sell Side Only**: 0.0625% of sell value
- **Example**: Sell 50 lots @ ₹100 = ₹5000 → STT = ₹3.125

### **3. Exchange Fees**

- **NSE**: 0.053% of turnover (both buy and sell)
- **Example**: Turnover = ₹10000 → Exchange fees = ₹5.30

### **4. GST**

- **18% on (Brokerage + Exchange Fees)**
- **Example**: (₹20 + ₹5.30) \* 0.18 = ₹4.55

### **5. Slippage**

- **Estimated**: 0.05% of order value
- **Example**: Buy @ ₹100 → Actual fill @ ₹100.05

---

## Total Transaction Cost

**Formula**:

```python
def calculate_transaction_cost(order_value, side):
    brokerage = 20
    exchange_fees = order_value * 0.00053
    stt = order_value * 0.000625 if side == 'SELL' else 0
    gst = (brokerage + exchange_fees) * 0.18
    slippage = order_value * 0.0005

    total = brokerage + exchange_fees + stt + gst + slippage
    return total
```

**Example** (Buy + Sell):

```
Buy 50 lots @ ₹100 (₹5000):
  Brokerage: ₹20
  Exchange: ₹2.65
  GST: ₹4.08
  Slippage: ₹2.50
  Total: ₹29.23

Sell 50 lots @ ₹110 (₹5500):
  Brokerage: ₹20
  STT: ₹3.44
  Exchange: ₹2.92
  GST: ₹4.13
  Slippage: ₹2.75
  Total: ₹33.24

Round-trip cost: ₹62.47 (1.18% of entry value)
```

---

## Backtesting Engine

### **1. Load Historical Data + Predictions**

```python
def load_backtest_data():
    features = pd.read_parquet('data/04_feature/features.parquet')
    predictions = pd.read_parquet('data/07_model_output/ensemble_predictions.parquet')

    df = features.merge(predictions, on=['timestamp', 'symbol'])
    return df
```

---

### **2. Generate Signals**

```python
def generate_signals(df, threshold=0.7):
    df['signal'] = 0  # 0 = no position, 1 = long
    df.loc[df['prediction'] > threshold, 'signal'] = 1
    return df
```

---

### **3. Simulate Trades**

```python
def simulate_trades(df, initial_capital=100000):
    capital = initial_capital
    position = 0  # 0 = no position, 1 = in position
    trades = []

    for i, row in df.iterrows():
        if row['signal'] == 1 and position == 0:
            # Entry
            entry_price = row['close']
            entry_cost = calculate_transaction_cost(entry_price * 50, 'BUY')
            capital -= entry_cost
            position = 1
            entry_time = row['timestamp']

        elif row['signal'] == 0 and position == 1:
            # Exit
            exit_price = row['close']
            exit_cost = calculate_transaction_cost(exit_price * 50, 'SELL')
            pnl = (exit_price - entry_price) * 50 - entry_cost - exit_cost
            capital += pnl
            position = 0

            trades.append({
                'entry_time': entry_time,
                'exit_time': row['timestamp'],
                'entry_price': entry_price,
                'exit_price': exit_price,
                'pnl': pnl,
                'return': pnl / (entry_price * 50),
            })

    return trades, capital
```

---

## Performance Metrics

### **1. Sharpe Ratio**

```python
def calculate_sharpe_ratio(returns, risk_free_rate=0.06):
    excess_returns = returns - (risk_free_rate / 252)  # Daily risk-free rate
    sharpe = np.mean(excess_returns) / np.std(excess_returns) * np.sqrt(252)
    return sharpe
```

**Target**: >1.5

---

### **2. Sortino Ratio**

```python
def calculate_sortino_ratio(returns, risk_free_rate=0.06):
    excess_returns = returns - (risk_free_rate / 252)
    downside_returns = excess_returns[excess_returns < 0]
    downside_std = np.std(downside_returns)
    sortino = np.mean(excess_returns) / downside_std * np.sqrt(252)
    return sortino
```

**Target**: >2.0

---

### **3. Maximum Drawdown**

```python
def calculate_max_drawdown(equity_curve):
    peak = equity_curve.expanding(min_periods=1).max()
    drawdown = (equity_curve - peak) / peak
    max_dd = drawdown.min()
    return max_dd
```

**Target**: <20%

---

### **4. Win Rate**

```python
def calculate_win_rate(trades):
    winning_trades = [t for t in trades if t['pnl'] > 0]
    win_rate = len(winning_trades) / len(trades)
    return win_rate
```

**Target**: >50%

---

### **5. Profit Factor**

```python
def calculate_profit_factor(trades):
    gross_profit = sum([t['pnl'] for t in trades if t['pnl'] > 0])
    gross_loss = abs(sum([t['pnl'] for t in trades if t['pnl'] < 0]))
    profit_factor = gross_profit / gross_loss if gross_loss > 0 else np.inf
    return profit_factor
```

**Target**: >1.5

---

## Nodes

### **1. run_backtest**

**Function**: `run_backtest(predictions, features)`

```python
def run_backtest(predictions, features):
    df = features.merge(predictions, on=['timestamp', 'symbol'])
    df = generate_signals(df, threshold=0.7)
    trades, final_capital = simulate_trades(df, initial_capital=100000)

    return trades, final_capital
```

---

### **2. compute_metrics**

**Function**: `compute_performance_metrics(trades)`

```python
def compute_performance_metrics(trades):
    returns = [t['return'] for t in trades]

    metrics = {
        'sharpe_ratio': calculate_sharpe_ratio(returns),
        'sortino_ratio': calculate_sortino_ratio(returns),
        'max_drawdown': calculate_max_drawdown(equity_curve),
        'win_rate': calculate_win_rate(trades),
        'profit_factor': calculate_profit_factor(trades),
        'total_trades': len(trades),
        'avg_pnl': np.mean([t['pnl'] for t in trades]),
    }

    return metrics
```

---

## Parameters

**File**: `conf/base/parameters/backtesting.yml`

```yaml
backtesting:
  initial_capital: 100000
  signal_threshold: 0.7
  lot_size: 50
  transaction_costs:
    brokerage: 20
    stt_rate: 0.000625
    exchange_rate: 0.00053
    gst_rate: 0.18
    slippage_rate: 0.0005
```

---

## Run

```bash
kedro run --pipeline backtesting
```

---

## Output

**File**: `data/08_reporting/backtest_results.csv`

**Schema**:

```csv
metric,value
sharpe_ratio,1.85
sortino_ratio,2.34
max_drawdown,-0.15
win_rate,0.58
profit_factor,1.72
total_trades,250
avg_pnl,350.25
```

---

## Visualization

**Equity Curve**:

```python
import matplotlib.pyplot as plt

plt.figure(figsize=(12, 6))
plt.plot(equity_curve)
plt.title('Equity Curve')
plt.xlabel('Time')
plt.ylabel('Capital (₹)')
plt.show()
```

---

## Testing

**Unit Tests**:

```python
def test_transaction_cost():
    cost = calculate_transaction_cost(5000, 'BUY')
    assert cost > 0
    assert cost < 100  # Sanity check

def test_backtest():
    trades, final_capital = run_backtest(predictions, features)
    assert len(trades) > 0
    assert final_capital > 0
```

---

## See Also

- [Train Ensemble Pipeline](./TRAIN_ENSEMBLE.md)
- [Export ONNX Pipeline](./EXPORT_ONNX.md)
