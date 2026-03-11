# Upstox Data Ingestion Guide

**Last Updated**: March 11, 2026  
**API Version**: Upstox API v2/v3  
**Account**: Upstox Plus (Depth-30, expired instruments, enhanced limits)

---

## Overview

This guide details how to ingest data from Upstox for the ML training pipeline. We have access to:

- **Upstox Plus** subscription (Depth-30 access)
- Historical data API (candles, expired F&O)
- Live WebSocket (tick-by-tick with LOB)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      UPSTOX DATA INGESTION ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  DATA SOURCES                                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ HISTORICAL (REST API)                                                  │  │
│  │ ├── /v2/historical-candle        → Active instruments (daily, 1min)   │  │
│  │ ├── /v3/historical-candle        → Pagination support                 │  │
│  │ ├── /v2/expired-instruments/...  → Expired F&O                        │  │
│  │ └── /v2/option/chain             → Option chain snapshot              │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ LIVE (WebSocket)                                                       │  │
│  │ ├── LTPC                         → Last Traded Price/Qty              │  │
│  │ ├── Option Greeks                → Delta, Gamma, Theta, Vega, Rho     │  │
│  │ ├── Full                         → OHLC + Depth-5 + Greeks            │  │
│  │ └── Full D30 (Plus)              → OHLC + Depth-30 + Greeks           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Available Data Summary

| Data Type | Start | End | Granularity | API |
|-----------|-------|-----|-------------|-----|
| **NIFTY 50 Daily** | Jan 2000 | Today | Daily | historical-candle |
| **NIFTY 50 1-Min** | Jan 2022 | Today | 1 minute | historical-candle |
| **51 Constituents** | Jan 2000 | Today | Daily, 1-min | historical-candle |
| **NIFTY Futures** | Jun 2000 | Today | Daily, 1-min | expired-instruments |
| **NIFTY Options** | Jun 2001 | Today | Daily, 1-min | expired-instruments |
| **India VIX** | Feb 2014 | Today | Daily, 1-min | historical-candle |
| **Live Tick** | Today | Ongoing | Tick-by-tick | WebSocket |

---

## API Endpoints

### Historical Candles (Active Instruments)

```bash
# V2 API
GET /v2/historical-candle/{instrument_key}/{interval}/{to_date}/{from_date}

# V3 API (with pagination)
GET /v3/historical-candle/{instrument_key}/{interval}/{to_date}/{from_date}
```

**Intervals**: `1minute`, `3minute`, `5minute`, `15minute`, `30minute`, `day`

**Example**:
```bash
curl -X GET \
  'https://api.upstox.com/v2/historical-candle/NSE_INDEX|Nifty%2050/day/2026-01-18/2000-01-01' \
  -H 'Authorization: Bearer {token}' \
  -H 'Accept: application/json'
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "candles": [
      ["2026-01-17T00:00:00+05:30", 23456.75, 23489.10, 23398.45, 23445.60, 234567890]
      // [timestamp, open, high, low, close, volume]
    ]
  }
}
```

### Expired Instruments (F&O)

#### Get Expiry Dates
```bash
GET /v2/expired-instruments/expiries/{underlying_key}
# Example: /v2/expired-instruments/expiries/NSE_INDEX|Nifty%2050
```

**Response**:
```json
{
  "status": "success",
  "data": ["2025-01-30", "2025-01-23", "2025-01-16", ...]
}
```

#### Get Option Contracts for Expiry
```bash
GET /v2/expired-instruments/option-contracts/{underlying_key}/{expiry_date}
```

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "name": "NIFTY",
      "segment": "NSE_FO",
      "exchange": "NSE",
      "expiry": "2025-04-17",
      "instrument_key": "NSE_FO|47983|17-04-2025",
      "exchange_token": "47983",
      "trading_symbol": "NIFTY 20400 PE 17 APR 25",
      "tick_size": 5,
      "lot_size": 75,
      "instrument_type": "PE",
      "freeze_quantity": 1800,
      "underlying_key": "NSE_INDEX|Nifty 50",
      "underlying_type": "INDEX",
      "underlying_symbol": "NIFTY",
      "strike_price": 20400,
      "minimum_lot": 75,
      "weekly": true
    }
  ]
}
```

#### Get Historical Candles for Expired Contract
```bash
GET /v2/expired-instruments/historical-candle/{instrument_key}/{interval}/{to}/{from}
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "candles": [
      ["2022-11-30T00:00:00+05:30", 125.35, 126.8, 122.1, 123.45, 1542678, 184632]
      // [timestamp, open, high, low, close, volume, open_interest]
    ]
  }
}
```

### Live WebSocket (Depth-30)

#### Connection
```bash
wss://api.upstox.com/feed/market-data-feed
# Header: Authorization: Bearer {token}
```

#### Subscription Request
```json
{
  "guid": "unique-request-id",
  "method": "sub",
  "data": {
    "mode": "full_d30",
    "instrumentKeys": ["NSE_FO|45450", "NSE_INDEX|Nifty 50"]
  }
}
```

#### Live Feed Response (Full D30)
```json
{
  "type": "live_feed",
  "feeds": {
    "NSE_FO|45450": {
      "fullFeed": {
        "marketFF": {
          "ltpc": {
            "ltp": 213.75,
            "ltt": "1740727891235",
            "ltq": "150",
            "cp": 494.05
          },
          "marketLevel": {
            "bidAskQuote": [
              { "bidQ": "75", "bidP": 213.45, "askQ": "525", "askP": 213.9 },
              { "bidQ": "225", "bidP": 213.3, "askQ": "150", "askP": 213.95 },
              // ... 30 levels
            ]
          },
          "optionGreeks": {
            "delta": 0.4952,
            "theta": -8.4067,
            "gamma": 0.0007,
            "vega": 16.769,
            "rho": 3.8673
          },
          "marketOHLC": {
            "ohlc": [
              { "interval": "1d", "open": 400, "high": 400, "low": 208.7, "close": 213.75, "vol": "779400" },
              { "interval": "I1", "open": 210, "high": 212.8, "low": 208.7, "close": 212.15, "vol": "8475" }
            ]
          },
          "atp": 272.9,
          "vtt": "779625",
          "oi": 210000,
          "iv": 0.131378,
          "tbq": 46050,
          "tsq": 41850
        }
      }
    }
  },
  "currentTs": "1740727891739"
}
```

---

## Data Ingestion Scripts

### Historical Daily Data (26 Years)

```python
import requests
import pandas as pd
from datetime import datetime, timedelta

def fetch_daily_candles(
    instrument_key: str,
    from_date: str,
    to_date: str,
    token: str
) -> pd.DataFrame:
    """
    Fetch daily OHLCV data from Upstox.
    """
    url = f"https://api.upstox.com/v2/historical-candle/{instrument_key}/day/{to_date}/{from_date}"
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/json'
    }
    
    response = requests.get(url, headers=headers)
    data = response.json()
    
    if data['status'] != 'success':
        raise Exception(f"API error: {data}")
    
    candles = data['data']['candles']
    df = pd.DataFrame(candles, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    return df


# Fetch 26 years of NIFTY 50 daily data
nifty_daily = fetch_daily_candles(
    instrument_key='NSE_INDEX|Nifty%2050',
    from_date='2000-01-01',
    to_date='2026-01-18',
    token=access_token
)
```

### Expired Options Data

```python
def fetch_all_expired_options(
    underlying_key: str,
    token: str
) -> list[pd.DataFrame]:
    """
    Fetch all expired option contracts with OHLCV + OI.
    """
    # 1. Get all expiry dates
    expiries_url = f"https://api.upstox.com/v2/expired-instruments/expiries/{underlying_key}"
    headers = {'Authorization': f'Bearer {token}', 'Accept': 'application/json'}
    
    expiries = requests.get(expiries_url, headers=headers).json()['data']
    all_data = []
    
    for expiry in expiries:
        # 2. Get option contracts for this expiry
        contracts_url = f"https://api.upstox.com/v2/expired-instruments/option-contracts/{underlying_key}/{expiry}"
        contracts = requests.get(contracts_url, headers=headers).json()['data']
        
        for contract in contracts:
            # 3. Fetch historical data for each contract
            instrument_key = contract['instrument_key']
            candles_url = f"https://api.upstox.com/v2/expired-instruments/historical-candle/{instrument_key}/day/{expiry}/{from_date}"
            
            candle_data = requests.get(candles_url, headers=headers).json()
            if candle_data['status'] == 'success':
                df = pd.DataFrame(candle_data['data']['candles'])
                df['strike'] = contract['strike_price']
                df['option_type'] = contract['instrument_type']
                df['expiry'] = contract['expiry']
                df['lot_size'] = contract['lot_size']
                all_data.append(df)
    
    return all_data
```

### Live Tick Collection

```python
import asyncio
import websockets
import json

async def collect_ticks(
    instrument_keys: list[str],
    token: str,
    on_tick: callable
):
    """
    Stream live tick data with Depth-30.
    """
    uri = "wss://api.upstox.com/feed/market-data-feed"
    headers = {"Authorization": f"Bearer {token}"}
    
    async with websockets.connect(uri, extra_headers=headers) as ws:
        # Subscribe with Full D30 mode
        subscribe_msg = {
            "guid": "sub_1",
            "method": "sub",
            "data": {
                "mode": "full_d30",
                "instrumentKeys": instrument_keys
            }
        }
        await ws.send(json.dumps(subscribe_msg))
        
        async for message in ws:
            data = json.loads(message)
            if data.get('type') == 'live_feed':
                for instrument_key, feed in data['feeds'].items():
                    await on_tick(instrument_key, feed, data['currentTs'])
```

---

## QuestDB Ingestion

```python
from questdb.ingress import Sender

async def write_tick_to_questdb(
    instrument_key: str,
    feed: dict,
    timestamp: str
):
    """
    Write tick data to QuestDB.
    """
    market_ff = feed.get('fullFeed', {}).get('marketFF', {})
    ltpc = market_ff.get('ltpc', {})
    greeks = market_ff.get('optionGreeks', {})
    depth = market_ff.get('marketLevel', {}).get('bidAskQuote', [])
    
    with Sender.from_conf("http::addr=localhost:9000") as sender:
        sender.row(
            'tick_data',
            symbols={'instrument_key': instrument_key},
            columns={
                'ltp': float(ltpc.get('ltp', 0)),
                'ltq': int(ltpc.get('ltq', 0)),
                'cp': float(ltpc.get('cp', 0)),
                'oi': int(market_ff.get('oi', 0)),
                'iv': float(market_ff.get('iv', 0)),
                'tbq': int(market_ff.get('tbq', 0)),
                'tsq': int(market_ff.get('tsq', 0)),
                # Greeks
                'delta': greeks.get('delta'),
                'theta': greeks.get('theta'),
                'gamma': greeks.get('gamma'),
                'vega': greeks.get('vega'),
                'rho': greeks.get('rho'),
                # Depth (first 5 levels for core features)
                'bid_price_1': depth[0]['bidP'] if len(depth) > 0 else None,
                'bid_qty_1': int(depth[0]['bidQ']) if len(depth) > 0 else None,
                'ask_price_1': depth[0]['askP'] if len(depth) > 0 else None,
                'ask_qty_1': int(depth[0]['askQ']) if len(depth) > 0 else None,
            },
            at_now=True
        )
```

---

## Rate Limits & Considerations

### API Rate Limits

| Endpoint | Rate Limit | Notes |
|----------|------------|-------|
| Historical Candles | 25/sec, 250/min | Per user |
| Expired Instruments | 25/sec, 250/min | Plus account only |
| WebSocket | **5 connections** | Upstox Plus (was 3) |
| D30 Subscriptions | **50 instruments** | Per connection, Plus |
| LTPC Subscriptions | **5000 instruments** | Per connection |
| Option Greeks Sub | **2000 instruments** | Per connection |

### Data Considerations

1. **VIX Data**: India VIX launched Feb 26, 2014 - no data before this date
2. **Option Chain Depth**: Full chain available for expired contracts
3. **Tick Data**: Only available live (no historical tick-by-tick)
4. **Greeks**: Pre-computed by exchange for options, NULL for futures

---

## Instrument Keys

### Index
```
NSE_INDEX|Nifty 50
NSE_INDEX|Nifty Bank
NSE_INDEX|India VIX
NSE_INDEX|Nifty IT
```

### Futures (Current)
```
NSE_FO|NIFTY25JANFUT
NSE_FO|NIFTY25FEBFUT
```

### Options (Example)
```
NSE_FO|NIFTY2501923000CE
NSE_FO|NIFTY2501922500PE
```

### Constituent Stocks
```
NSE_EQ|RELIANCE
NSE_EQ|TCS
NSE_EQ|HDFCBANK
... (50 symbols)
```

---

## Related Documentation

- [DATA_ARCHITECTURE.md](./DATA_ARCHITECTURE.md) - Overall data architecture
- [QUESTDB_TRAINING_DATA.md](./QUESTDB_TRAINING_DATA.md) - QuestDB schemas
- [market-feeder README](../../services/market-feeder/README.md) - Live data collection
