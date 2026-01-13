# Historical Data Bootstrap - Quick Start

## Setup

1. **Set your Upstox Access Token** in `services/market-feeder/.env`:

```env
UPSTOX_ACCESS_TOKEN=your_access_token_here
AUTO_BOOTSTRAP_HISTORICAL_DATA=false  # Set to 'true' for auto-bootstrap on startup
```

2. **Get your access token** from Upstox:
   - Login to Upstox Developer Console
   - Generate access token (valid for 1 day)
   - Copy and paste into `.env`

## Usage

### Manual Trigger (Recommended)

Start the market-feeder service, then call the bootstrap endpoint:

```bash
curl http://localhost:3002/historical-data/bootstrap
```

This will:

- Check QuestDB for existing 1-minute candle data (past 1 year)
- Skip instruments that already have data
- Fetch missing data from Upstox V3 API
- Insert into `market_candles` table

### Auto-Bootstrap on Startup

Set in `.env`:

```env
AUTO_BOOTSTRAP_HISTORICAL_DATA=true
```

The service will automatically check and fetch missing data on startup.

## What Gets Fetched

- **NIFTY 50 Index** (`NSE_INDEX|Nifty 50`)
- **India VIX** (`NSE_INDEX|India VIX`)
- **All 50 NIFTY50 stocks** (RELIANCE, TCS, HDFCBANK, etc.)
- **Interval**: 1-minute candles
- **Period**: Past 1 year from today

## Data Schema

Stored in `market_candles` table:

- `timestamp` - Candle timestamp
- `instrument_key` - Upstox instrument key
- `interval_value` - 1
- `interval_unit` - 'minute'
- `open, high, low, close, volume, open_interest`

## Rate Limiting

- **100ms delay** between daily batches
- **500ms delay** between instruments
- Respects Upstox limit: 250 requests/second

## Monitoring

Check logs for progress:

```
[HistoricalDataBootstrapService] Bootstrapping historical data for 52 instruments
[HistoricalDataBootstrapService] Fetching 1-minute candles for NSE_INDEX|Nifty 50...
[HistoricalDataBootstrapService] ✓ Inserted 75000 candles for NSE_INDEX|Nifty 50
```

## Notes

- Access tokens expire after 1 day - regenerate as needed
- Upstox returns max ~1000 candles per request, so 1-minute data is fetched in daily batches
- Existing data is automatically skipped to avoid duplicates
