# Nifty 50 Constituent Changes - Historical Data

> **Last Updated**: March 17, 2026

## Overview

This file tracks all Nifty 50 constituent changes to ensure historical accuracy when computing features.

## Data Structure

```typescript
export const REMOVED_NIFTY50_CONSTITUENTS = [
  {
    companyName: 'UPL Limited',
    symbol: 'UPL',
    instrumentKey: 'NSE_EQ|INE628A01036',
    effectiveFrom: '28-03-2024',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE721A01047',
      symbol: 'SHRIRAMFIN',
    },
  },
  // ... more entries
];
```

## Constituent Changes (2024-2025)

| Removed Stock | Symbol     | Removal Date | Replacement        | Symbol     |
| ------------- | ---------- | ------------ | ------------------ | ---------- |
| UPL Limited   | UPL        | 28-03-2024   | Shriram Finance    | SHRIRAMFIN |
| LTI Mindtree  | LTI        | 30-09-2024   | Bharat Electronics | BEL        |
| Divis Labs    | DIVISLAB   | 30-09-2024   | Trent              | TRENT      |
| Britannia     | BRITANNIA  | 28-03-2025   | Etern              | ETERNAL    |
| BPCL          | BPCL       | 28-03-2025   | Jio Financial      | JIOFIN     |
| Hero MotoCorp | HEROMOTOCO | 30-09-2025   | IndiGo             | INDIGO     |
| IndusInd Bank | INDUSINDBK | 30-09-2025   | Max Healthcare     | MAXHEALTH  |

## Usage in Feature Computation

### Correct Historical Constituents

```typescript
import { ConstituentManagerService } from './constituent-manager.service';

const manager = new ConstituentManagerService();

// Sept 29, 2024 (before DIVISLAB removal)
const before = manager.getConstituentsAtTimestamp(new Date('2024-09-29'));
// Returns: [..., 'NSE_EQ|INE361B01024' (DIVISLAB), ...]

// Sept 30, 2024 (after DIVISLAB removal)
const after = manager.getConstituentsAtTimestamp(new Date('2024-09-30'));
// Returns: [..., 'NSE_EQ|INE849A01020' (TRENT), ...]
// DIVISLAB is NOT included
```

### Time Ranges for Batch Processing

```typescript
const ranges = manager.getConstituentTimeRanges();

// DIVISLAB: { start: null, end: Date('2024-09-29') }
// TRENT: { start: Date('2024-09-30'), end: null }
```

## Implementation Details

### Date Parsing

Effective dates are in `DD-MM-YYYY` format (Indian standard):

```typescript
parseEffectiveDate('30-09-2024'); // → Date(2024, 8, 30)
```

### Validity Logic

- **Removed stock**: Active until day **before** effective date
  - DIVISLAB: Active until Sept 29, 2024 23:59:59
- **Added stock**: Active **from** effective date onwards
  - TRENT: Active from Sept 30, 2024 00:00:00

### Edge Cases

1. **Same-day queries**: Use exact timestamp for boundary checks
2. **Multiple removals same day**: Both removed stocks excluded, both added stocks included
3. **Future dates**: Returns current constituents

---

**Data Source**: NSE India website, Nifty 50 constituent changes announcements
**Last Updated**: March 17, 2026
