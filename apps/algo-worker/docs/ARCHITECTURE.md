# Algo Worker - Quantum Architecture

## Overview

The `algo-worker` has been upgraded to the **Quantum Core** architecture, a 7-Layer Cognitive System designed for institutional-grade trading.

## The 7 Layers

### 1. Perception Layer (Data Ingestion)
- **Service**: `DataCollectionService`
- **Tech**: `market-feeder` (via Redis Streams)
- **Data**: Ticks, Quotes, Option Chain, News (FinBERT input).

### 2. Cortex Layer (Feature Engineering)
- **Service**: `FeatureEngineeringService`
- **Tech**: TypeScript + QuestDB
- **Features**:
    - Technical: RSI, MACD, Volatility.
    - Sentiment: **FinBERT-India** scores (Positive/Negative/Neutral).
    - Microstructure: Order flow imbalance.

### 3. Prediction Layer (Alpha Generation)
- **Service**: `SignalEngineService`
- **Models**:
    - **TFT (Temporal Fusion Transformer)**: Multi-horizon price forecasting.
    - **Ensemble**: XGBoost + Stacking (Legacy support).
- **Output**: `AlphaSignal` (Direction + Confidence + Horizon).

### 4. Cognition Layer (Strategy & RL)
- **Service**: `PolicyEngineService`
- **Agent**: **Deep Q-Network (DQN)**
- **Logic**:
    - Receives `AlphaSignal`.
    - Observes `PortfolioState`.
    - Action: `TargetAllocation` (e.g., "Long 50% Nifty").

### 5. Execution Layer (Action)
- **Service**: `ExecutionEngineService`
- **Logic**: Smart Order Routing (SOR).
- **Algo**: TWAP / VWAP to minimize impact.

### 6. Memory Layer (Storage)
- **Hot**: Redis (Signals, Orders, State).
- **Warm**: QuestDB (Features, Ticks).
- **Cold**: MongoDB (Trade History, Logs).

### 7. Control Layer (Ops)
- **Monitoring**: Prometheus metrics exposed at `/metrics`.
- **Tracing**: OpenTelemetry spans for every signal.

## Data Flow

```
Market Data -> [Perception] -> [Cortex] -> Features
Features -> [Prediction] -> Alpha Signal
Alpha Signal + State -> [Cognition] -> Target Allocation
Target Allocation -> [Risk Manager] -> Validated Order
Validated Order -> [Execution] -> Broker API
```

## Key Upgrades from V1

- **Transformers**: Replaced simple LSTM with TFT for better long-term forecasting.
- **Sentiment**: Integrated FinBERT for news-based alpha.
- **RL Agent**: Replaced static strategy matrix with dynamic RL agent.
