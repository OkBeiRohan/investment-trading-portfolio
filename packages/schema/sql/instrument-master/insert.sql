INSERT INTO instrument_master (
  instrument_key, exchange, segment, instrument_type, tradingsymbol,
  name, expiry, strike, option_type, lot_size, tick_size,
  underlying_key, is_expired, last_updated
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
)
