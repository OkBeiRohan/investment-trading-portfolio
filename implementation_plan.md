# Project Quantum: Implementation Plan

## Goal
Upgrade the `investment-trading-portfolio` to a 7-Layer Cognitive Architecture ("Project Quantum") integrating Transformers, RL, and Sentiment Analysis.

## Roadmap

### Phase 1: Foundation & Perception (Weeks 1-2)
- [ ] **Infrastructure**: Set up Redis Streams and QuestDB.
- [ ] **Market Feeder**: Implement `MarketFeeder` service with WebSocket multiplexing.
- [ ] **News Ingestion**: Create `NewsIngestor` for financial news.
- [ ] **Database**: Finalize `@repo/database` schemas for Features and Signals.

### Phase 2: Cortex & Prediction (Weeks 3-5)
- [ ] **Feature Engine**: Port technical indicators to `FeatureEngine`.
- [ ] **Sentiment Model**: Integrate `FinBERT-India` using ONNX Runtime.
- [ ] **TFT Model**: Train and export Temporal Fusion Transformer for Nifty 50.
- [ ] **Ensemble**: Migrate existing XGBoost models to the new pipeline.

### Phase 3: Cognition & Execution (Weeks 6-8)
- [ ] **RL Environment**: Create a Gym environment for the trading simulator.
- [ ] **Agent Training**: Train DQN agent on historical data.
- [ ] **Risk Manager**: Implement symbolic risk rules (Max Drawdown, etc.).
- [ ] **Execution Engine**: Connect to Upstox API for live/paper trading.

### Phase 4: Control & UI (Weeks 9-10)
- [ ] **Dashboard**: Build Next.js dashboard for real-time monitoring.
- [ ] **Observability**: Set up Prometheus metrics and Grafana dashboards.
- [ ] **Backtesting**: Run extensive walk-forward validation.

## Detailed Tasks

### 1. Shared Packages
- **@repo/schema**: Add Zod schemas for `NewsEvent`, `SentimentScore`, `RLAction`.
- **@repo/ai-models**: Create `ModelInterface` and wrappers for FinBERT/TFT.
- **@repo/market-sdk**: Add `NewsProvider` interface.

### 2. Apps
- **algo-worker**: Refactor into 7-layer structure.
    - `src/perception/`
    - `src/cortex/`
    - `src/prediction/`
    - `src/cognition/`
    - `src/execution/`
- **web**: Add "AI Confidence" and "Sentiment" widgets.

## Verification Plan

### Automated Tests
- **Unit**: Test feature calculation accuracy.
- **Integration**: Verify `News -> Sentiment -> Signal` flow.
- **Backtest**: Compare Quantum performance vs. Benchmark (Buy & Hold).

### Manual Checks
- **Latency**: Ensure end-to-end latency < 100ms.
- **Safety**: Verify circuit breakers trigger correctly under simulated crash.
