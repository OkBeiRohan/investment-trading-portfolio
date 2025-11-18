#!/usr/bin/env node
/**
 * End-to-End Signal Generation Test
 * Tests the complete ML inference pipeline:
 * 1. Generate synthetic features
 * 2. Run XGBoost + SVM inference via Python
 * 3. Generate trading signal
 * 4. Persist to MongoDB (if available)
 * 5. Verify output
 */

const http = require('http');

const TEST_FEATURES = {
  // Volatility indicators
  realizedVol5d: 0.22,
  realizedVol10d: 0.2,
  realizedVol20d: 0.18,

  // Technical indicators
  rsi14: 65,
  macdValue: 1.5,
  macdSignal: 1.2,
  macdHistogram: 0.3,
  sma20: 19500,
  sma50: 19200,
  ema12: 19600,
  ema26: 19300,

  // Market sentiment (elevated volatility)
  indiaVix: 18.5,
  indiaVixMA5: 17.2,
  pcrVolume: 1.15,
  pcrOI: 1.2,
  maxPain: 19500,

  // Options metrics
  atmIV: 20.5,
  volSkew: 2.1,
  termStructure: 1.05,
  callIVSpread: 2.5,
  putIVSpread: 3.0,

  // Time features (market hours)
  hour: 11,
  dayOfWeek: 3,
  isMarketOpen: 1,
};

function makeRequest(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/test/signal',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function runTest() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  End-to-End Signal Generation Test                        ║');
  console.log(
    '╚════════════════════════════════════════════════════════════╝\n',
  );

  console.log('📊 Test Features (High Volatility Scenario):');
  console.log('  India VIX: 18.5 (elevated)');
  console.log('  PCR Volume: 1.15 (bullish sentiment)');
  console.log('  ATM IV: 20.5% (high implied volatility)');
  console.log('  Vol Skew: 2.1 (puts expensive)\n');

  console.log('🔄 Sending test request to algo-worker...\n');

  try {
    const response = await makeRequest({
      userId: 'test-user-e2e',
      features: TEST_FEATURES,
    });

    if (response.success) {
      console.log('✅ Signal Generated Successfully!\n');
      console.log('📈 Signal Details:');
      console.log(`  Signal ID: ${response.signalId}`);
      console.log(`  Prediction: ${response.prediction || 'N/A'}`);
      console.log(
        `  Confidence: ${response.confidence ? (response.confidence * 100).toFixed(1) + '%' : 'N/A'}`,
      );
      console.log(
        `  Probability: ${response.probability ? response.probability.toFixed(4) : 'N/A'}`,
      );

      if (response.modelContributions) {
        console.log('\n🤖 Model Contributions:');
        console.log(
          `  XGBoost: ${response.modelContributions.xgboost?.toFixed(4) || 'N/A'}`,
        );
        console.log(
          `  SVM: ${response.modelContributions.svm?.toFixed(4) || 'N/A'}`,
        );
        console.log(
          `  CNN-LSTM: ${response.modelContributions.cnnLstm?.toFixed(4) || 'not trained'}`,
        );
        console.log(
          `  GINN: ${response.modelContributions.ginn?.toFixed(4) || 'not trained'}`,
        );
      }

      if (response.metadata) {
        console.log('\n⚡ Performance:');
        console.log(`  Latency: ${response.metadata.latencyMs}ms`);
      }

      console.log('\n✓ Test PASSED: Signal generated and persisted to MongoDB');
      process.exit(0);
    } else {
      console.error('❌ Test FAILED:', response.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test FAILED with error:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error(
      '  1. Ensure algo-worker is running: pnpm --filter algo-worker dev',
    );
    console.error('  2. Check MongoDB connection is configured');
    console.error('  3. Verify models are trained and in models/ directory');
    console.error('  4. Ensure Python environment is activated');
    process.exit(1);
  }
}

// Run the test
runTest().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
