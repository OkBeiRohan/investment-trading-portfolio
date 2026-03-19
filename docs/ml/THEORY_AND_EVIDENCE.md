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
Using heavy deep learning models (like Transformers) on aggregated order flow features (e.g., 14 summarized data points) is prone to overfitting and violates latency constraints.

### The Solution: Queue Imbalance & DeepLOB
For ultra-low latency tick-level prediction, we use fast, semi-parametric **Local Logistic Regression** on Queue Imbalance. It is proven that Level 1 queue imbalance provides significant predictive power for the direction of the very next mid-price movement.

For multi-horizon (10s - 1m) microstructure prediction, we use the **DeepLOB** architecture. DeepLOB uses Convolutional Neural Networks (CNNs) to capture the spatial structure of the full limit order book (Level 2/3 depth arrays) before passing features to LSTMs for temporal dependencies.

*References:*
- *Gould, M. D., & Bonart, J. (2015). Queue Imbalance as a One-Tick-Ahead Price Predictor in a Limit Order Book.*
- *Zhang, Z., Zohren, S., & Roberts, S. (2019). DeepLOB: Deep Convolutional Neural Networks for Limit Order Books.*

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