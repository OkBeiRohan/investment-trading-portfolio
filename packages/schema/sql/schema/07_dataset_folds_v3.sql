-- TABLE 7: dataset_folds
-- Stores machine learning train/test splits derived from CPCV

CREATE TABLE IF NOT EXISTS dataset_folds (
    instrument_key SYMBOL,        -- e.g., 'NSE_INDEX|Nifty 50'
    dataset_name SYMBOL,          -- e.g., 'nifty50_cpcv_lightgbm'
    fold_id INT,                  -- e.g., 1 to K
    split_type SYMBOL,            -- 'TRAIN' or 'TEST'
    range_start TIMESTAMP,        -- Start of the contiguous split
    range_end TIMESTAMP,          -- End of the contiguous split
    created_at TIMESTAMP          -- When the batch was mapped
) timestamp(created_at) PARTITION BY MONTH WAL;
