-- Get all instruments with their last timestamps (bulk gap detection)
-- Parameters: $1 = table_name (substituted in application code), $2 = min_timestamp (ISO timestamp, optional)
-- Note: Table name must be substituted before execution
SELECT 
  instrument_key,
  timestamp as last_timestamp
FROM {TABLE_NAME}
LATEST ON timestamp PARTITION BY instrument_key;
