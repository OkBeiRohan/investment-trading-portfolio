-- Get last known timestamp for an instrument (LATEST ON query)
-- Parameters: $1 = table_name (substituted in application code), $2 = instrument_key
-- Note: Table name must be substituted before execution
SELECT timestamp
FROM {TABLE_NAME}
WHERE instrument_key = $1
LATEST ON timestamp PARTITION BY instrument_key;
