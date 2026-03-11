/**
 * Data Processing Log Schema (MongoDB)
 * Tracks all errors and events during data pipeline
 *
 * Categories:
 * - FETCH: Data fetching from Upstox
 * - COMPUTE: Feature computation
 * - TRAIN: Model training
 * - TRADE: Live trading execution
 */

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type ProcessingLogDocument = HydratedDocument<ProcessingLog>;

@Schema({
  timestamps: true,
  timeseries: {
    timeField: "timestamp",
    metaField: "category",
    granularity: "minutes",
  },
})
export class ProcessingLog {
  @Prop({ required: true, index: true })
  timestamp!: Date;

  /**
   * Log category
   */
  @Prop({
    required: true,
    enum: ["FETCH", "COMPUTE", "TRAIN", "TRADE", "SYSTEM", "CRON"],
    index: true,
  })
  category!: "FETCH" | "COMPUTE" | "TRAIN" | "TRADE" | "SYSTEM" | "CRON";

  /**
   * Log level
   */
  @Prop({
    required: true,
    enum: ["DEBUG", "INFO", "WARN", "ERROR", "FATAL"],
    index: true,
  })
  level!: "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";

  /**
   * Related instrument (if applicable)
   */
  @Prop({ sparse: true, index: true })
  instrumentKey?: string;

  /**
   * Operation being performed
   */
  @Prop({ required: true })
  operation!: string;

  /**
   * Log message
   */
  @Prop({ required: true })
  message!: string;

  /**
   * Error code (if error)
   */
  @Prop({ sparse: true, index: true })
  errorCode?: string;

  /**
   * Error stack trace
   */
  @Prop()
  stackTrace?: string;

  /**
   * Additional context (JSON)
   */
  @Prop({ type: Object })
  context?: Record<string, unknown>;

  /**
   * Duration of operation (ms)
   */
  @Prop()
  durationMs?: number;

  /**
   * Records processed (if applicable)
   */
  @Prop()
  recordsProcessed?: number;

  /**
   * Records failed (if applicable)
   */
  @Prop()
  recordsFailed?: number;

  /**
   * Service that generated the log
   */
  @Prop({ required: true })
  service!: string;

  /**
   * Hostname
   */
  @Prop()
  hostname?: string;
}

export const ProcessingLogSchema = SchemaFactory.createForClass(ProcessingLog);

// TTL index - auto-delete logs older than 90 days
ProcessingLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 },
);

// Compound indexes for common queries
ProcessingLogSchema.index({ category: 1, level: 1, timestamp: -1 });
ProcessingLogSchema.index({ instrumentKey: 1, category: 1, timestamp: -1 });
ProcessingLogSchema.index({ errorCode: 1, timestamp: -1 });
