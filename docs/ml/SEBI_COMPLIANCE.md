# SEBI Algorithmic Trading Compliance

**Last Updated**: March 28, 2026
**Regulatory Deadline**: April 1, 2026

---

## Overview

This document covers the operational compliance requirements from SEBI Circular SEBI/HO/MRD/MRD-PoD-2/P/CIR/2025/21 (February 2025) for retail algorithmic trading in India. Full mandatory compliance starts April 1, 2026.

---

## Requirements and Implementation Status

### 1. Unique Algo-ID Registration

**SEBI requirement:** Every algorithm must be registered with the exchange through the broker and assigned a unique Algo-ID. Every order must carry this identifier.

**Implementation:**
- Algo-ID generated per strategy and stored in MongoDB `system_configs`
- Every order placed via Upstox API includes the Algo-ID tag
- Algo-ID tracked in the 5-year audit trail alongside order details

### 2. Static IP Whitelisting + 2FA

**SEBI requirement:** All retail API users must operate from whitelisted static IP addresses. Family members sharing connections require 2FA-verified consent.

**Implementation:**
- API access restricted to configured static IPs at the infrastructure level
- 2FA enforced via Better Auth (TOTP support built-in)
- Session validation checks IP against whitelist on every API call

### 3. Five-Year Audit Trail

**SEBI requirement:** Brokers must maintain detailed logs of all algo activity for minimum 5 years, including order timestamps, IP addresses, Algo-IDs, and strategy parameters.

**Implementation:**
- Every algo order logged to QuestDB `algo_audit_trail` table (partitioned by month for 5-year retention)
- Fields: timestamp, IP address, Algo-ID, strategy name, strategy parameters, instrument, order type, quantity, price, fill details, latency
- MongoDB `audit_logs` collection for admin actions (experiment creation, model deployment, config changes)
- Both stores configured with retention policies exceeding 5 years

### 4. Broker Partnership

**SEBI requirement:** All algo providers must formally partner with registered brokers. Brokers hold full responsibility for every algorithm on their platform.

**Implementation:**
- Upstox integration as the registered broker partner
- All orders routed through Upstox API with proper authentication
- Broker-registered Algo-IDs for each strategy

### 5. Cybersecurity (VAPT)

**SEBI requirement:** Mandatory Vulnerability Assessment and Penetration Testing (VAPT), OAuth, and encrypted data exchange.

**Implementation:**
- OWASP ZAP automated scanning on all API endpoints
- OAuth 2.0 via Better Auth for user authentication
- SSL/TLS on all inter-service communication
- VAPT results documented for broker submission

### 6. Mock Trading Session

**SEBI requirement:** Brokers must participate in at least one mock trading session before live deployment.

**Implementation:**
- End-to-end order flow tested in Upstox sandbox mode
- Paper trading validation with full signal-to-order pipeline before live graduation

---

## Compliance Timeline

| Date | Milestone | Status |
|------|-----------|--------|
| Oct 31, 2025 | Broker applies for registration of at least one strategy | Pending |
| Nov 30, 2025 | Full registration of API-based algo products | Pending |
| Jan 3, 2026 | Mock trading session participation | Pending |
| Jan 5, 2026 | Non-compliant brokers barred from new API clients | Pending |
| Apr 1, 2026 | Full framework mandatory | Pending |

---

## Audit Trail Schema (QuestDB)

```sql
CREATE TABLE algo_audit_trail (
    timestamp TIMESTAMP,
    algo_id SYMBOL,
    strategy_name SYMBOL,
    instrument_key SYMBOL,
    order_type SYMBOL,
    side SYMBOL,
    quantity DOUBLE,
    price DOUBLE,
    fill_price DOUBLE,
    fill_quantity DOUBLE,
    order_id STRING,
    status SYMBOL,
    client_ip STRING,
    strategy_params STRING,
    model_version STRING,
    signal_score DOUBLE,
    latency_ms DOUBLE,
    error STRING
) TIMESTAMP(timestamp) PARTITION BY MONTH;
```

---

## Related Documentation

- [TRAINING_PIPELINE.md](./TRAINING_PIPELINE.md) -- Model training and quality gates
- [MLFLOW_PLATFORM.md](./MLFLOW_PLATFORM.md) -- MLflow model registry and versioning
