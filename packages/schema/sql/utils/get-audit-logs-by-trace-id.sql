-- Query audit logs by trace ID (full request lifecycle)
-- Parameters: $1 = trace_id
SELECT 
  timestamp,
  trace_id,
  service,
  level,
  action,
  user_id,
  metadata
FROM system_audit
WHERE trace_id = $1
ORDER BY timestamp ASC;
