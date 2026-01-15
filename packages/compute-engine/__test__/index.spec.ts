import test from 'ava'

import { computeFeatures, type FeatureInput, type ComputeResult } from '../index.js'

test('computeFeatures returns valid result', (t) => {
  const input: FeatureInput = {
    timestamp: Date.now(),
    niftyFuture: {
      ltp: 21500,
      open: 21450,
      high: 21550,
      low: 21400,
      close: 21500,
      volume: 1000000,
      openInterest: 5000000,
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
        optionType: 'CE',
        ltp: 120,
        iv: 0.15,
        delta: 0.5,
        gamma: 0.001,
        vega: 25,
        theta: -15,
        openInterest: 100000,
        volume: 50000,
      },
    ],
    indiaVix: 15.5,
  }

  const result: ComputeResult = computeFeatures(input)

  t.truthy(result.features)
  t.is(typeof result.totalDurationMicros, 'number')
  t.true(result.totalDurationMicros > 0)
  t.true(Array.isArray(result.timings))
  t.true(result.timings.length > 0)
})
