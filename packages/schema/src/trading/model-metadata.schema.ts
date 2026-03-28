/**
 * Model Metadata Schema
 * Tracks ML model versions, checksums, and performance metrics
 */

import { z } from "zod";

/**
 * Model types supported in the system
 */
export const modelTypeEnum = z.enum([
  "XGBOOST",
  "CNN_LSTM",
  "GINN",
  "SVM",
  "LOGISTIC_REGRESSION",
  "ENSEMBLE",
]);

export type ModelType = z.infer<typeof modelTypeEnum>;

/**
 * Model status enum
 */
export const modelStatusEnum = z.enum([
  "ACTIVE", // Currently in use
  "INACTIVE", // Not in use but available
  "TRAINING", // Currently being trained
  "DEPRECATED", // Old version, marked for deletion
  "FAILED", // Training or loading failed
]);

export type ModelStatus = z.infer<typeof modelStatusEnum>;

/**
 * Model format enum
 */
export const modelFormatEnum = z.enum([
  "PYTORCH",
  "MLFLOW_NATIVE",
  "PYFUNC",
  "XGBOOST_JSON",
  "LIGHTGBM",
  "PICKLE",
  "JOBLIB",
]);

export type ModelFormat = z.infer<typeof modelFormatEnum>;

/**
 * Performance metrics for binary classification models
 */
export const performanceMetricsSchema = z.object({
  accuracy: z.number().min(0).max(1),
  precision: z.number().min(0).max(1),
  recall: z.number().min(0).max(1),
  f1Score: z.number().min(0).max(1),
  auc: z.number().min(0).max(1),
  sharpeRatio: z.number().optional(),
  sortinoRatio: z.number().optional(),
  maxDrawdown: z.number().optional(),
  calmarRatio: z.number().optional(),
});

export type PerformanceMetrics = z.infer<typeof performanceMetricsSchema>;

/**
 * Training configuration
 */
export const trainingConfigSchema = z.object({
  hyperparameters: z.record(z.string(), z.unknown()),
  trainingDataPeriod: z.object({
    start: z.date(),
    end: z.date(),
  }),
  validationDataPeriod: z
    .object({
      start: z.date(),
      end: z.date(),
    })
    .optional(),
  features: z.array(z.string()),
  targetVariable: z.string(),
  trainingDurationMs: z.number().optional(),
});

export type TrainingConfig = z.infer<typeof trainingConfigSchema>;

/**
 * Model metadata schema
 * Stores comprehensive information about each ML model version
 */
export const modelMetadataSchema = z.object({
  modelName: z.string(), // e.g., "xgboost_v1.2.0"
  modelType: modelTypeEnum,
  modelFormat: modelFormatEnum,
  version: z.string(), // Semantic versioning: "1.2.0"
  status: modelStatusEnum,

  // File information
  filePath: z.string(),
  checksum: z.string(), // MD5 or SHA256 hash
  fileSizeBytes: z.number(),

  // MLflow integration
  mlflowModelUri: z.string().optional(),
  mlflowModelId: z.string().optional(),
  servingEndpoint: z.string().optional(),

  // Performance metrics
  performanceMetrics: performanceMetricsSchema.optional(),

  // Training information
  trainingConfig: trainingConfigSchema.optional(),

  // Metadata
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  createdBy: z.string().default("system"),
  deployedAt: z.date().optional(),

  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ModelMetadata = z.infer<typeof modelMetadataSchema>;

/**
 * Input for creating a new model metadata entry
 */
export type ModelMetadataCreateInput = Omit<
  ModelMetadata,
  "createdAt" | "updatedAt"
>;

/**
 * Input for updating model metadata
 */
export type ModelMetadataUpdateInput = Partial<
  Omit<ModelMetadata, "createdAt" | "updatedAt">
>;
