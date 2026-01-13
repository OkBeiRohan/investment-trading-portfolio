-- Find missing data ranges (gaps in time-series)
-- Returns array of [start, end] Date tuples where data is missing
-- Template variables: {pgInterval}, {TABLE_NAME}
WITH expected_timestamps AS (
  SELECT timestamp_sequence($1::timestamp, $2::timestamp, INTERVAL '{pgInterval}') as expected_ts
),
actual_data AS (
  SELECT timestamp
  FROM {TABLE_NAME}
  WHERE instrument_key = $3
    AND timestamp >= $1
    AND timestamp <= $2
)
SELECT expected_ts
FROM expected_timestamps
LEFT JOIN actual_data ON expected_timestamps.expected_ts = actual_data.timestamp
WHERE actual_data.timestamp IS NULL
ORDER BY expected_ts;
