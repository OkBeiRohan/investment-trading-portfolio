/**
 * Trading Configuration
 * Centralized configuration for algo-worker
 */

import { registerAs } from '@nestjs/config';

export default registerAs('trading', () => ({
  // MongoDB Configuration
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    database: process.env.MONGODB_DATABASE || 'trading',
  },

  // Upstox API Configuration
  upstox: {
    apiKey: process.env.UPSTOX_API_KEY || '',
    apiSecret: process.env.UPSTOX_API_SECRET || '',
    redirectUri:
      process.env.UPSTOX_REDIRECT_URI || 'http://localhost:3001/auth/callback',
  },

  // ML Models Configuration
  models: {
    xgboost: {
      path: process.env.XGBOOST_MODEL_PATH || './models/xgboost.onnx',
      threshold: parseFloat(process.env.XGBOOST_THRESHOLD || '0.55'),
      version: process.env.XGBOOST_VERSION || '1.0.0',
    },
    cnnLstm: {
      path: process.env.CNN_LSTM_MODEL_PATH || './models/cnn_lstm.onnx',
      sequenceLength: parseInt(process.env.CNN_LSTM_SEQ_LENGTH || '60', 10),
      version: process.env.CNN_LSTM_VERSION || '1.0.0',
    },
    ginn: {
      garchPath: process.env.GARCH_MODEL_PATH || './models/garch.onnx',
      lstmPath: process.env.GINN_LSTM_PATH || './models/ginn_lstm.onnx',
      version: process.env.GINN_VERSION || '1.0.0',
    },
    svm: {
      path: process.env.SVM_MODEL_PATH || './models/svm.onnx',
      kernel: process.env.SVM_KERNEL || 'rbf',
      version: process.env.SVM_VERSION || '1.0.0',
    },
    stacking: {
      path: process.env.STACKING_MODEL_PATH || './models/stacking.onnx',
      version: process.env.STACKING_VERSION || '1.0.0',
    },
  },

  // Risk Management Configuration
  risk: {
    maxDailyLoss: parseInt(process.env.MAX_DAILY_LOSS || '-50000', 10),
    maxDrawdown: parseInt(process.env.MAX_DRAWDOWN || '-100000', 10),
    maxPositions: parseInt(process.env.MAX_POSITIONS || '5', 10),
    minCashReserve: parseInt(process.env.MIN_CASH_RESERVE || '100000', 10),
    maxLeverage: parseFloat(process.env.MAX_LEVERAGE || '1.5'),
    maxDelta: parseInt(process.env.MAX_DELTA || '500', 10),
    maxVega: parseInt(process.env.MAX_VEGA || '100', 10),
    maxGamma: parseInt(process.env.MAX_GAMMA || '50', 10),
  },

  // Position Sizing Configuration
  sizing: {
    kellyMultiplier: parseFloat(process.env.KELLY_MULTIPLIER || '0.25'),
    maxRiskPerTrade: parseFloat(process.env.MAX_RISK_PER_TRADE || '0.02'),
  },

  // Signal Configuration
  signal: {
    minConfidence: parseFloat(process.env.MIN_CONFIDENCE || '0.55'),
    maxSignalAge: parseInt(process.env.MAX_SIGNAL_AGE || '300000', 10), // 5 minutes in ms
  },

  // Feature Store Configuration
  features: {
    timeSeriesCollection: process.env.FEATURES_COLLECTION || 'features',
    retentionDays: parseInt(process.env.FEATURES_RETENTION_DAYS || '90', 10),
  },

  // Training Data Configuration
  training: {
    exportPath: process.env.TRAINING_EXPORT_PATH || './data/exports',
    labelLookAheadHours: parseInt(process.env.LABEL_LOOKAHEAD_HOURS || '4', 10),
  },

  // Execution Configuration
  execution: {
    orderTimeoutMs: parseInt(process.env.ORDER_TIMEOUT_MS || '60000', 10),
    maxRetries: parseInt(process.env.ORDER_MAX_RETRIES || '3', 10),
    slippageModel: process.env.SLIPPAGE_MODEL || 'pessimistic', // 'pessimistic' | 'realistic'
  },

  // GPU Configuration
  gpu: {
    enabled: process.env.GPU_ENABLED === 'true' || true,
    deviceId: parseInt(process.env.GPU_DEVICE_ID || '0', 10),
  },
}));
