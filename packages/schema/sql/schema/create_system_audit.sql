-- System audit log for distributed tracing
-- Expected: 100K events/day (all system actions with trace_id)
CREATE TABLE IF NOT EXISTS system_audit (
  timestamp TIMESTAMP,
  trace_id SYMBOL CAPACITY 100000 INDEX,
  service SYMBOL CAPACITY 20,
  level SYMBOL CAPACITY 10,
  action SYMBOL CAPACITY 100,
  user_id SYMBOL CAPACITY 1000,
  metadata STRING
) TIMESTAMP(timestamp) PARTITION BY DAY WAL;
