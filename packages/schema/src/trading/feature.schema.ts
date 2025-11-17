/**
 * Feature Snapshot Schemas
 * Time-series feature storage for ML training
 */

import { z } from "zod";
import { DataQualityEnum } from "./enums";

// ============================================
// MACD Indicator
// ============================================

export const macdSchema = z.object({
  value: z.number(),
  signal: z.number(),
  histogram: z.number(),
});

export type MACD = z.infer<typeof macdSchema>;

// ============================================
// Feature Set
// ============================================

export const featuresSchema = z.object({
  // Underlying features
  realizedVol5d: z.number().optional(),
  realizedVol10d: z.number().optional(),
  realizedVol20d: z.number().optional(),
  rsi14: z.number().optional(),
  macd: macdSchema.optional(),

  // Sentiment features
  indiaVix: z.number().optional(),
  indiaVixMA5: z.number().optional(),
  pcrVolume: z.number().optional(),
  pcrOI: z.number().optional(),
  maxPain: z.number().optional(),

  // Options features
  atmIV: z.number().optional(),
  volSkew: z.number().optional(),
  termStructure: z.number().optional(),
});

export type Features = z.infer<typeof featuresSchema>;

// ============================================
// Feature Metadata
// ============================================

export const featureMetadataSchema = z.object({
  dataQuality: DataQualityEnum,
  missingFields: z.array(z.string()),
  version: z.string(),
});

export type FeatureMetadata = z.infer<typeof featureMetadataSchema>;

// ============================================
// Feature Snapshot (MongoDB Time-Series Collection)
// ============================================

export const featureSnapshotSchema = z.object({
  timestamp: z.date(),
  instrument: z.string(),
  features: featuresSchema,
  metadata: featureMetadataSchema,
});

export type FeatureSnapshot = z.infer<typeof featureSnapshotSchema>;
