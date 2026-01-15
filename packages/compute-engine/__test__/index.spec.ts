import test from 'ava'

import { computeFeatures } from '../index.js'
import type { FeatureInput, ComputeResult } from '@repo/schema/compute-engine'

test('computeFeatures returns valid result', (t) => {
  const input: FeatureInput = {
    timestamp: Date.now(),
    nifty_future: {
      ltp: 21500,
      open: 21450,
      high: 21550,
      low: 21400,
      close: 21500,
      volume: 1000000,
      open_interest: 5000000,
    },
    constituents: [
      {
        symbol: 'RELIANCE',
        ltp: 2500,
        open: 2480,
        volume: 500000,
      },
    ],
    options: [
      {
        strike: 21500,
        option_type: 'CE',
        ltp: 120,
        iv: 0.15,
        delta: 0.5,
        gamma: 0.001,
        vega: 25,
        theta: -15,
        open_interest: 100000,
        volume: 50000,
      },
    ],
    india_vix: 15.5,
  }

  const inputJson = JSON.stringify(input)
  const resultJson = computeFeatures(inputJson)
  const result: ComputeResult = JSON.parse(resultJson)

  t.truthy(result.features)
  t.is(typeof result.total_duration_micros, 'number')
  t.true(result.total_duration_micros > 0)
  t.true(Array.isArray(result.timings))
  t.true(result.timings.length > 0)
})
