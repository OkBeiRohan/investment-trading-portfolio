SELECT
  instrument_key,
  dataset_name,
  fold_id,
  split_type,
  range_start,
  range_end,
  created_at
FROM dataset_folds
WHERE instrument_key = $1
  AND dataset_name = $2
ORDER BY fold_id ASC, range_start ASC
