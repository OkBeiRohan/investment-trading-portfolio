-- Query training labels with optional filters
-- Used by: Label validation, quality analysis
SELECT * FROM training_labels
WHERE timestamp BETWEEN $1 AND $2
ORDER BY timestamp ASC;
