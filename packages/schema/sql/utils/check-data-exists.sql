-- Generic data existence check for any table
-- Parameters: $1 = table_name (substituted in application code), $2 = instrument_key, $3 = start_time (ISO timestamp), $4 = end_time (ISO timestamp)
-- Note: Table name must be substituted before execution for security
SELECT COUNT(*) as count
FROM {TABLE_NAME}
WHERE instrument_key = $1
  AND timestamp >= $2
  AND timestamp <= $3;
