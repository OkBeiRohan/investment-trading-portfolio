-- Get training labels with quality filtering
-- Used by: Label validation, quality analysis
SELECT *
FROM training_labels
WHERE timestamp BETWEEN $1 AND $2
  AND index_name = $3
  AND label_quality = $4
ORDER BY timestamp ASC
LIMIT $5;
