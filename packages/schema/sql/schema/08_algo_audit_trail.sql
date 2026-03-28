-- SEBI Compliance: 5-year audit trail for algorithmic trading orders
-- Circular SEBI/HO/MRD/MRD-PoD-2/P/CIR/2025/21 (Feb 2025)
-- Partitioned by MONTH for efficient 5-year retention queries

CREATE TABLE IF NOT EXISTS algo_audit_trail (
    timestamp TIMESTAMP,
    algo_id SYMBOL INDEX,
    strategy_name SYMBOL INDEX,
    instrument_key SYMBOL INDEX,
    order_type SYMBOL,
    side SYMBOL,
    quantity DOUBLE,
    price DOUBLE,
    fill_price DOUBLE,
    fill_quantity DOUBLE,
    order_id STRING,
    status SYMBOL INDEX,
    client_ip STRING,
    strategy_params STRING,
    model_version STRING,
    mlflow_run_id STRING,
    signal_score DOUBLE,
    confidence_weights STRING,
    regime_state INT,
    latency_ms DOUBLE,
    sandbox BOOLEAN,
    error STRING
) TIMESTAMP(timestamp) PARTITION BY MONTH
DEDUP UPSERT KEYS(timestamp, order_id);
