# Theory and Evidence for ML Architecture

**Last Updated**: March 2026  
**Status**: Canonical Reference

This document serves as the theoretical backbone for the architectural choices made across the ML trading system. Every major component is grounded in peer-reviewed quantitative finance literature, microstructure research, and live market mechanics.

## 1. Validation & Leakage Controls (Tier 0 & 1)

### The Problem
Financial time series exhibit strong autocorrelation, volatility clustering (GARCH effects), and macroeconomic memory. A standard K-fold or simple walk-forward split (even on daily data) leaks information because macro regimes span across train/test boundaries. If a test set falls in the middle of a bull run, the surrounding training data will leak the regime's characteristics.

### The Solution: Combinatorial Purged Cross-Validation (CPCV)
We mandate CPCV for all models to prevent this target leakage.
- **Purging:** Removes training samples whose labels overlap the test set.
- **Embargoing:** Removes training samples immediately following the test set to prevent delayed market reactions from leaking backward.

*Reference: López de Prado, M. (2018). Advances in Financial Machine Learning.*

## 2. Dynamic Labeling (Tier 2)

### The Problem
Using a static threshold like `0.001 * sqrt(t)` assumes that volatility strictly follows a Geometric Brownian Motion scaling law. This ignores the well-documented U-shaped intraday volatility seasonality (high at open/close, low at midday) and shifting market volatility regimes.

### The Solution: Triple-Barrier Method
We generate labels using dynamic, volatility-adjusted barriers.
1. **Upper Barrier (Take Profit):** Scaled dynamically by a rolling estimate of realized intraday volatility.
2. **Lower Barrier (Stop Loss):** Scaled similarly.
3. **Vertical Barrier (Time Stop):** The maximum holding horizon.
This correctly models actual trading constraints (risk and time) rather than arbitrary price targets.

*Reference: López de Prado, M. (2018). Advances in Financial Machine Learning.*

## 3. Microstructure Intelligence (Tier 3)

### The Problem
Microstructure prediction requires processing the full depth-30 LOB at high frequency (every 100ms) while maintaining low latency. The architecture must handle both the spatial structure of the order book and temporal dynamics.

### The Solution: Phased Activation (Rules → MLP → LiT Transformer)

We use a three-phase progressive activation approach to handle the cold-start problem (zero historical LOB data at launch):

- **Phase 1 (Months 1-3)**: Analytical rules based on **Queue Imbalance** and OFI thresholds. Queue imbalance at Level 1 provides significant next-tick predictive power (Gould & Bonart, 2015; Cont, Kukanov & Stoikov, 2014).
- **Phase 2 (Months 4-6)**: Shallow MLP trained on accumulated LOB data.
- **Phase 3 (Month 6+)**: Full **LiT (Limit Order Book Transformer)**, which uses structured patches and transformer-based self-attention on the raw Depth-30 LOB.

**Why LiT over DeepLOB**: LiT (King's College London, Frontiers in AI, Oct 2025) consistently outperforms both DeepLOB (Zhang et al., 2019) and TransLOB across multiple LOB datasets and prediction horizons. LiT also demonstrates robust performance under distributional shifts via fine-tuning, making it practical for dynamic financial environments. DeepLOB's CNN+LSTM architecture is older and does not capture long-range LOB dependencies as effectively as transformer self-attention.

*References:*
- *Briola, A., et al. (2025). LiT: Limit Order Book Transformer. Frontiers in Artificial Intelligence.*
- *Zhang, Z., Zohren, S., & Roberts, S. (2019). DeepLOB: Deep Convolutional Neural Networks for Limit Order Books.*
- *Cont, R., Kukanov, A., & Stoikov, S. (2014). The Price Impact of Order Book Events.*
- *Gould, M. D., & Bonart, J. (2015). Queue Imbalance as a One-Tick-Ahead Price Predictor.*

## 4. Signal Fusion & Sizing (Tier 4)

### The Problem: Kelly Miscalibration
Deep learning models (especially attention-based gating networks) are frequently overconfident. Feeding raw neural network probabilities directly into the Kelly Criterion formula mathematically guarantees overbetting. Overbetting, even with a positive expected value strategy, leads to long-term portfolio ruin.

### The Solution: Calibrated Fractional Kelly
Model output must pass through a **Probability Calibration** layer (e.g., Isotonic Regression or Beta Calibration) to ensure that a predicted probability of 70% matches an actual empirical win rate of 70%. We also enforce a strict **Fractional Kelly** (e.g., Half-Kelly) limit to account for parameter uncertainty.

*Reference: MacLean, L. C., Ziemba, W. T., & Blazenko, G. (1992). Growth versus security in dynamic investment analysis.*

### The Problem: Strike Selection Hindsight Bias
Training a neural network to pick the "best" historical strike leaks the entire future price path of the underlying asset into the training labels, guaranteeing severe overfitting to historical volatility realizations.

### The Solution: Deterministic Option Pricing
We use an **Underlying-First** approach. The ML models predict the underlying's expected move and volatility. Then, a deterministic options pricing model (e.g., Black-Scholes) simulates the payoff of all available strikes to find the highest reward-to-risk ratio. This physically separates predictive alpha from derivative mathematics.

## 5. Arbitrage-Free Option Modeling

### The Problem
Predicting raw Implied Volatility (IV) surface points via standard ML models (like VAEs or MLPs) often generates surfaces that violate static no-arbitrage conditions (calendar spread and butterfly arbitrage).

### The Solution: SSVI Parameterization
We train models to predict the parameters ($\theta_t, \rho, \phi$) of the **Surface Stochastic Volatility Inspired (SSVI)** model. This guarantees that the generated IV surfaces are completely free of static arbitrage by construction.

*Reference: Gatheral, J., & Jacquier, A. (2014). Arbitrage-free SVI volatility surfaces.*

## 6. Model Evaluation & Promotion

### The Problem
Annualizing high-frequency returns (e.g., 1-minute data) using $\sqrt{252 \times 375}$ vastly overestimates Sharpe ratios due to the non-normality (fat tails, skewness) of the returns. Furthermore, hyperparameter tuning over hundreds of variations introduces the Probability of Backtest Overfitting (PBO)—a false positive is inevitable.

### The Solution: Deflated Sharpe Ratio (DSR)
We mandate the **Deflated Sharpe Ratio** for all model promotions. DSR mathematically discounts the reported Sharpe ratio based on:
1. The number of independent trials attempted.
2. The non-normality (skewness and kurtosis) of the strategy's returns.
3. The length of the backtest.

*Reference: Bailey, D. H., & López de Prado, M. (2014). The Deflated Sharpe Ratio: Correcting for Selection Bias, Backtest Overfitting and Non-Normality.*

## 7. Data-Bound Rule & Feature History Compliance

### The Problem
The architecture's cardinal rule states: "A model trained on 26 years of daily data must never consume features that only exist for 7 days." But multiple tiers violate this: Tier 1 feeds 0-history features (MCX websocket, Tier 0 outputs, FinBERT sentiment) into its "26-year" model. Tier 2 lists order-flow features (OFI, depth imbalance) as inputs but these have zero multi-year history.

### The Solution: Feature-Group Segregation
Each tier splits features into groups by historical depth. Features with insufficient history are:
1. **Excluded from training entirely** (order flow features until ≥6 months archived)
2. **Used at inference-time only** (Tier 0 outputs, MCX, sentiment enrich the context vector but do NOT participate in historical model training)

This ensures the training window matches the actual data availability of the features used.

## 8. Sample Size Accuracy

### The Problem
Multiple documents overstated sample counts by up to 10x. The arithmetic 4yr × 252 days × 375 min = **378,000 rows**, not "~4M". Similarly, 3.5yr gives ~331K, not "~850K". Overstated sample counts hide overfitting risk — fitting LightGBM + Mamba + Meta-learner is harder to justify on 378K autocorrelated samples than on 4M.

### The Correction
All sample counts are now verified arithmetic. The ~378K 1-minute samples (per instrument) are sufficient for LightGBM (which handles autocorrelation via `bagging_freq`) but require careful regularization for deep sequence models like Mamba.