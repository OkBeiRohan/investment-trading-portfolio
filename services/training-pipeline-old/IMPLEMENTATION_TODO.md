# Training Pipeline Implementation TODO

**Status**: 🚧 In Progress  
**Last Updated**: January 16, 2026

---

## Phase 1: SQL Integration ✅ → 🚧

### 1.1 SQL Loader Enhancement

- [ ] Update `sql_loader.py` to point to `packages/schema/sql/` folder
- [ ] Implement SQL file resolution for market-state queries
- [ ] Implement SQL file resolution for training-labels queries
- [ ] Add error handling for missing SQL files
- [ ] Add caching for loaded SQL queries
- [ ] Test SQL loader with actual QuestDB connection

### 1.2 Schema Alignment

- [x] Verify `market_state_1m` table schema (33 features)
- [x] Verify `market_candles` JOIN for close_price
- [ ] Verify `training_labels_1m` table schema
- [ ] Map label columns to model input
- [ ] Document feature-to-SQL mapping

---

## Phase 2: Multi-Horizon Prediction 🔍

### 2.1 Architecture Decision

**Question**: One model or multiple models for different horizons (5min, 15min, 30min)?

**Option A: Single Multi-Output Model**

- [ ] Pros: Shared feature learning, less training time
- [ ] Cons: Complex loss function, harder to tune per horizon
- [ ] Implementation: LightGBM with multiple target columns

**Option B: Separate Models Per Horizon**

- [x] Pros: Independent tuning, clearer evaluation
- [x] Cons: More training time, more storage
- [x] **RECOMMENDED**: Start with separate models

**Decision**: ✅ Use **separate models per horizon** (train_lightgbm_5min, train_lightgbm_15min, train_lightgbm_30min)

### 2.2 Implementation Tasks

- [ ] Create labels for 5-minute horizon (existing)
- [ ] Create labels for 15-minute horizon
- [ ] Create labels for 30-minute horizon
- [ ] Train LightGBM_5min model
- [ ] Train LightGBM_15min model
- [ ] Train LightGBM_30min model
- [ ] Save models with horizon suffix (lightgbm_5min.txt, lightgbm_15min.txt)
- [ ] Document multi-horizon trading strategy

---

## Phase 3: Complete Training Pipeline 🚀

### 3.1 Data Loading

- [x] Load features from `market_state_1m` (SQL: `market-state/get-by-time-range.sql`)
- [ ] Load labels from `training_labels_1m` (SQL: `training-labels/get-by-time-range.sql`)
- [ ] Validate feature-label alignment (same timestamps)
- [ ] Handle missing data gracefully
- [ ] Add data quality checks

### 3.2 Model Training

- [x] LightGBM trainer implemented ✅
- [ ] XGBoost trainer (placeholder → log "Not implemented")
- [ ] CNN-LSTM trainer (placeholder → log "Not implemented")
- [ ] GINN trainer (placeholder → log "Not implemented")
- [ ] SVM trainer (placeholder → log "Not implemented")
- [ ] Transformer trainer (placeholder → log "Not implemented")
- [ ] TFT trainer (placeholder → log "Not implemented")
- [ ] LiT trainer (placeholder → log "Not implemented")

### 3.3 Model Export

- [ ] **ONNX Export**: Convert LightGBM → ONNX (FP16 quantization)
- [ ] **TensorFlow Export**: Convert LightGBM → TensorFlow SavedModel (if needed)
- [ ] Verify ONNX model outputs match LightGBM
- [ ] Test ONNX inference speed (<10ms target)
- [ ] Save models to `data/06_models/`
- [ ] Copy ONNX to `apps/algo-worker/models/`

---

## Phase 4: Model Validation Pipeline 📊

### 4.1 Dimension 1: Predictive Power

**Question**: Does it predict direction better than chance?

- [ ] **Metric**: Accuracy (target: >0.45 for 3-class)
- [ ] **Metric**: ROC-AUC (target: >0.65)
- [ ] **Metric**: Precision/Recall per class (UP, NEUTRAL, DOWN)
- [ ] **Test**: Statistical significance test (binomial test vs random)
- [ ] **Graph**: Confusion matrix heatmap
- [ ] **Graph**: ROC curves (one-vs-rest)
- [ ] **Graph**: Precision-Recall curves
- [ ] **Output**: `validation/01_predictive_power.png`

### 4.2 Dimension 2: Selectivity (Know When NOT to Trade)

**Question**: Does the model have high-confidence zones?

- [ ] **Metric**: Prediction confidence distribution (entropy)
- [ ] **Metric**: Win rate at different confidence thresholds
- [ ] **Test**: Stratify predictions by confidence (0.5-0.6, 0.6-0.7, >0.7)
- [ ] **Test**: No-trade zone analysis (neutral predictions)
- [ ] **Graph**: Confidence histogram (should be bimodal: high/low confidence)
- [ ] **Graph**: Win rate vs confidence threshold
- [ ] **Graph**: Trade frequency vs confidence threshold
- [ ] **Output**: `validation/02_selectivity.png`

### 4.3 Dimension 3: Stability Across Time & Regimes

**Question**: Does it work consistently?

- [ ] **Metric**: Per-fold accuracy variance (target: std <0.05)
- [ ] **Metric**: Performance across market regimes (high/low VIX)
- [ ] **Test**: Rolling window performance (30-day windows)
- [ ] **Test**: Regime clustering (VIX-based, breadth-based)
- [ ] **Graph**: Per-fold accuracy with confidence bands
- [ ] **Graph**: Cumulative accuracy over time
- [ ] **Graph**: Performance vs India VIX levels
- [ ] **Output**: `validation/03_stability.png`

### 4.4 Dimension 4: Profitability After Costs

**Question**: Positive expectancy after transaction costs?

- [ ] **Metric**: Expected value per trade (E[profit] - E[loss])
- [ ] **Metric**: Sharpe ratio (simulated backtest)
- [ ] **Metric**: Max drawdown
- [ ] **Test**: Monte Carlo simulation (1000 runs)
- [ ] **Test**: Transaction cost sensitivity (0.1%, 0.2%, 0.5%)
- [ ] **Graph**: Equity curve with drawdowns
- [ ] **Graph**: Trade P&L distribution
- [ ] **Graph**: Sharpe ratio vs confidence threshold
- [ ] **Output**: `validation/04_profitability.png`

### 4.5 Dimension 5: Explainability

**Question**: Why does the model work or fail?

- [ ] **Analysis**: SHAP values for top predictions
- [ ] **Analysis**: Feature importance (gain, split, cover)
- [ ] **Analysis**: Feature interaction effects
- [ ] **Test**: Partial dependence plots (top 5 features)
- [ ] **Test**: Error analysis (where does model fail?)
- [ ] **Graph**: Feature importance bar chart
- [ ] **Graph**: SHAP summary plot
- [ ] **Graph**: SHAP dependence plots (atm_iv, rsi_14, atr_percent)
- [ ] **Output**: `validation/05_explainability.png`

### 4.6 Validation Report Generation

- [ ] Generate HTML validation report
- [ ] Include all 5 dimensions with graphs
- [ ] Add pass/fail indicators per dimension
- [ ] Add recommendations for improvement
- [ ] Save to `data/08_reporting/validation_report.html`

---

## Phase 5: Pipeline Integration 🔧

### 5.1 Kedro Pipeline Structure

- [ ] Update `pipelines/train_ensemble/pipeline.py`
- [ ] Add validation pipeline after training
- [ ] Add export pipeline after validation
- [ ] Add parameter validation
- [ ] Add error handling and logging

### 5.2 Configuration

- [ ] Update `conf/base/parameters.yml` with validation params
- [ ] Add multi-horizon configs
- [ ] Add export configs (ONNX, TensorFlow)
- [ ] Add validation thresholds

### 5.3 End-to-End Test

- [ ] Test: `kedro run --pipeline train_ensemble`
- [ ] Test: `kedro run --pipeline validate_models`
- [ ] Test: `kedro run --pipeline export_onnx`
- [ ] Test: Full pipeline `kedro run`

---

## Phase 6: Documentation 📚

- [ ] Update `README.md` with new features
- [ ] Document multi-horizon strategy
- [ ] Document validation metrics
- [ ] Create `VALIDATION_GUIDE.md`
- [ ] Update `QUICK_START.md`
- [ ] Add examples to `notebooks/`

---

## Quick Reference: Commands

```bash
# Check features
python scripts/check_features.py

# Train LightGBM (5min horizon)
python scripts/train_lightgbm.py

# Train all horizons
kedro run --pipeline train_ensemble

# Validate models
kedro run --pipeline validate_models

# Export to ONNX
kedro run --pipeline export_onnx

# Full pipeline
kedro run
```

---

## Priority Order

1. **HIGH** 🔴: SQL loader integration (Phase 1)
2. **HIGH** 🔴: Multi-horizon decision & implementation (Phase 2)
3. **HIGH** 🔴: ONNX export (Phase 3.3)
4. **MEDIUM** 🟡: Validation pipeline (Phase 4)
5. **LOW** 🟢: TensorFlow export (Phase 3.3)
6. **LOW** 🟢: Documentation (Phase 6)

---

**Next Actions**:

1. ✅ Update SQL loader to use schema/sql files
2. ✅ Decide on multi-horizon architecture (separate models)
3. ⏳ Implement training-labels data loading
4. ⏳ Create validation pipeline
5. ⏳ Implement ONNX export
