# Mathematical Models

> **Specifications of quantitative models implemented in the Compute Engine.**

This document details the mathematical formulas and algorithms used for financial calculations.

---

## 1. Technical Indicators

### Relative Strength Index (RSI)
*Momentum oscillator that measures the speed and change of price movements.*

- **Formula**: Wilder's Smoothing method.
  $$ RSI = 100 - \frac{100}{1 + RS} $$
  $$ RS = \frac{\text{Average Gain}}{\text{Average Loss}} $$
- **Implementation**:
  - Initial step: Simple Average of gains/losses over $N$ periods.
  - Subsequent steps:
    $$ \text{AvgGain}_{t} = \frac{\text{AvgGain}_{t-1} \times (N-1) + \text{Current Gain}}{N} $$

### Moving Average Convergence Divergence (MACD)
*Trend-following momentum indicator.*

- **Formula**:
  $$ \text{MACD Line} = \text{EMA}_{12}(P) - \text{EMA}_{26}(P) $$
  $$ \text{Signal Line} = \text{EMA}_{9}(\text{MACD Line}) $$
  $$ \text{Histogram} = \text{MACD Line} - \text{Signal Line} $$

### Bollinger Bands
*Volatility channel.*

- **Formula**:
  $$ \text{Middle Band} = \text{SMA}_{20}(P) $$
  $$ \text{Upper Band} = \text{Middle Band} + (k \times \sigma) $$
  $$ \text{Lower Band} = \text{Middle Band} - (k \times \sigma) $$
- **Optimization**: $\sigma$ (Standard Deviation) is calculated using Welford's online algorithm for numerical stability and single-pass computation.

---

## 2. Option Pricing & Greeks

*Note: Live operational Greeks (Delta, Gamma, etc.) are consumed directly from the Upstox V3 WebSocket. The models below are implemented for:*
1.  **Theoretical Pricing**: Calculating "Fair Value" to detect mispricing (Arbitrage).
2.  **Volatility Surface Construction**: Inverting BSM to find IV from historical prices.
3.  **Risk Simulations**: Estimating Greeks under hypothetical scenarios (What-If analysis).

### Black-Scholes-Merton (BSM) Model
Used for pricing European options (Index Options in India are European).

**Inputs**:
- $S$: Spot Price
- $K$: Strike Price
- $T$: Time to Maturity (in years)
- $r$: Risk-free interest rate
- $\sigma$: Implied Volatility

**Formulas**:
$$ d_1 = \frac{\ln(S/K) + (r + \sigma^2/2)T}{\sigma\sqrt{T}} $$
$$ d_2 = d_1 - \sigma\sqrt{T} $$

### The Greeks

| Greek | Symbol | Meaning | Call Formula | Put Formula |
|-------|--------|---------|--------------|-------------|
| **Delta** | $\Delta$ | Sensitivity to Spot Price | $N(d_1)$ | $N(d_1) - 1$ |
| **Gamma** | $\Gamma$ | Sensitivity to Delta | $\frac{N'(d_1)}{S\sigma\sqrt{T}}$ | Same as Call |
| **Vega** | $\nu$ | Sensitivity to Volatility | $S\sqrt{T}N'(d_1)$ | Same as Call |
| **Theta** | $\Theta$ | Time Decay | $-\frac{S N'(d_1) \sigma}{2\sqrt{T}} - rKe^{-rT}N(d_2)$ | $-\frac{S N'(d_1) \sigma}{2\sqrt{T}} + rKe^{-rT}N(-d_2)$ |

*Note: $N(x)$ is the cumulative distribution function of the standard normal distribution, and $N'(x)$ is the probability density function.*

---

## 3. Implied Volatility (IV) Solver

Since $\sigma$ cannot be analytically isolated from the BSM formula, we solve for it numerically given the market price $C_{mkt}$.

### Newton-Raphson Method
Find root of $f(\sigma) = C_{BSM}(\sigma) - C_{mkt} = 0$.

$$ \sigma_{n+1} = \sigma_n - \frac{C_{BSM}(\sigma_n) - C_{mkt}}{\nu(\sigma_n)} $$

- **Convergence**: Quadratic.
- **Constraints**: Vega ($\nu$) approaches 0 for deep OTM/ITM options, causing instability.
- **Fallback**: Brent's Method is used if Newton-Raphson diverges or oscillates.

---

## 4. Volatility Surface

Constructs a continuous surface $\sigma(K, T)$ from discrete market quotes.

### Interpolation
- **Time Dimension**: Linear interpolation in total variance ($w = \sigma^2 T$).
- **Strike Dimension**: Cubic spline interpolation on log-moneyness ($k = \ln(K/S)$).

### SVI (Stochastic Volatility Inspired)
Parametric model to fit the volatility smile (skew).

$$ w(k) = a + b \{ \rho(k - m) + \sqrt{(k - m)^2 + \sigma^2} \} $$

Used for generating smooth smiles for risk management simulations.
