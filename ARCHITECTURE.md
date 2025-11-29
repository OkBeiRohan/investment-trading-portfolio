# Project Quantum: 7-Layer Cognitive Architecture

> **Institutional-grade algorithmic trading system for the Indian Market.**

## Overview

Project Quantum represents a paradigm shift from traditional ensemble-based trading to a **Hybrid Neuro-Symbolic Architecture**. It combines the pattern-matching capabilities of Deep Learning (Transformers) with the strategic adaptability of Reinforcement Learning (RL) and the safety of symbolic risk management.

---

## The 7-Layer Cognitive System

```mermaid
graph TD
    subgraph "Layer 1: Perception (Data Ingestion)"
        MD[Market Data Feed] -->|Ticks/Quotes| MF[Market Feeder]
        News[News/Twitter] -->|Text| MF
    end

    subgraph "Layer 2: Cortex (Feature Engineering)"
        MF -->|Stream| FE[Feature Engine]
        FE -->|Tech Indicators| QDB[(QuestDB)]
        FE -->|Sentiment| FB[FinBERT Model]
    end

    subgraph "Layer 3: Prediction (Alpha Generation)"
        QDB --> TFT[Temporal Fusion Transformer]
        QDB --> ENS[Ensemble Models]
        FB --> ENS
    end

    subgraph "Layer 4: Cognition (Strategy & RL)"
        TFT -->|Forecast| RL[RL Agent (DQN)]
        ENS -->|Signal| RL
        RL -->|Action| RM[Risk Manager]
    end

    subgraph "Layer 5: Execution (Action)"
        RM -->|Validated Order| EXE[Execution Engine]
        EXE -->|FIX/API| Broker[Upstox/Binance]
    end

    subgraph "Layer 6: Memory (Storage)"
        Redis[(Redis State)]
        Mongo[(MongoDB Logs)]
    end

    subgraph "Layer 7: Control (Ops)"
        MLOps[MLflow Tracking]
        Dash[Grafana/Web UI]
    end
```

---

## Layer Details

### 1. Perception Layer (Data Ingestion)
- **Responsibility**: Ingest raw data from external sources.
- **Components**:
    - `MarketFeeder`: Connects to Upstox WebSocket.
    - `NewsIngestor`: Polls RSS feeds and Twitter APIs.
- **Tech**: NestJS, Redis Streams.

### 2. Cortex Layer (Feature Engineering)
- **Responsibility**: Transform raw data into meaningful features.
- **Components**:
    - `FeatureEngine`: Calculates RSI, MACD, Bollinger Bands.
    - `SentimentEngine`: Runs FinBERT-India on news text.
- **Tech**: TypeScript, ONNX Runtime (for FinBERT).

### 3. Prediction Layer (Alpha Generation)
- **Responsibility**: Predict future price movements.
- **Components**:
    - `TFT Model`: Multi-horizon forecasting (e.g., next 5, 15, 60 mins).
    - `Ensemble`: XGBoost + Stacking for robust short-term signals.
- **Tech**: ONNX Runtime (GPU Accelerated).

### 4. Cognition Layer (Strategy & RL)
- **Responsibility**: Decide *what* to do based on predictions.
- **Components**:
    - `RL Agent`: Deep Q-Network (DQN) or PPO agent optimizing for Sharpe Ratio.
    - `RiskManager`: Hard-coded rules (Symbolic AI) to prevent catastrophic loss.
- **Tech**: TensorFlow/PyTorch (Training), ONNX (Inference).

### 5. Execution Layer (Action)
- **Responsibility**: Execute trades efficiently.
- **Components**:
    - `SmartOrderRouter`: Splits large orders (TWAP/VWAP).
    - `ExecutionEngine`: Manages order lifecycle (New -> Filled -> Closed).
- **Tech**: NestJS, Upstox API.

### 6. Memory Layer (Storage)
- **Responsibility**: Persist state and history.
- **Components**:
    - `Redis`: Hot state (current positions, active orders).
    - `QuestDB`: Warm state (time-series features, ticks).
    - `MongoDB`: Cold state (trade logs, user profiles).

### 7. Control Layer (Ops & Monitoring)
- **Responsibility**: Observe and control the system.
- **Components**:
    - `Dashboard`: Real-time UI (Next.js).
    - `MLOps`: Model versioning and performance tracking.
    - `Alerts`: Prometheus/Grafana alerts.

---

## Key Technologies

- **Languages**: TypeScript (Core), Python (ML Training).
- **Frameworks**: NestJS, Next.js, PyTorch.
- **AI/ML**: ONNX Runtime, Hugging Face Transformers, Stable Baselines3.
- **Infrastructure**: Docker, Kubernetes (Optional).

## Design Principles

1.  **Latency First**: Hot paths must be non-blocking.
2.  **Safety Always**: Risk Manager has veto power over AI.
3.  **Data Driven**: All decisions logged and traceable.
4.  **Modular**: Layers are loosely coupled via events.
