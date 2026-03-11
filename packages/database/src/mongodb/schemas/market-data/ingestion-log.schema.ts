import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

/**
 * Ingestion Log Schema
 * Tracks historical data fetch operations and errors
 * Used for retry logic and debugging
 */
@Schema({ timestamps: true })
export class IngestionLog extends Document {
  @Prop({ required: true, index: true })
  instrumentKey: string;

  @Prop({ required: true })
  operation:
    | "FETCH_DAILY"
    | "FETCH_MINUTE"
    | "FETCH_TICK"
    | "FETCH_EXPIRED_FUTURE"
    | "FETCH_EXPIRED_OPTION"
    | "BACKFILL_ALL"
    | "INSTRUMENT_SYNC"
    | "PRE_MARKET_GLOBAL";

  @Prop({ type: Object, required: true })
  requestedRange: {
    start: Date;
    end: Date;
  };

  @Prop({ required: true })
  status: "PENDING" | "IN_PROGRESS" | "SUCCESS" | "PARTIAL" | "FAILED";

  // Result details (on success)
  @Prop({ type: Object })
  result?: {
    candlesFetched: number;
    candlesStored: number;
    duplicatesSkipped: number;
    firstCandleTime?: Date;
    lastCandleTime?: Date;
  };

  // Error details (on failure)
  @Prop({ type: Object })
  error?: {
    code: string;
    message: string;
    httpStatus?: number;
    retryCount: number;
    lastRetryAt?: Date;
  };

  // API details
  @Prop()
  apiEndpoint?: string;

  @Prop()
  apiVersion?: string;

  // Timing
  @Prop()
  startedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  durationMs?: number;

  // Rate limiting
  @Prop()
  rateLimitRemaining?: number;

  @Prop()
  rateLimitReset?: Date;
}

export const IngestionLogSchema = SchemaFactory.createForClass(IngestionLog);

// Indexes for efficient querying
IngestionLogSchema.index({ instrumentKey: 1, createdAt: -1 });
IngestionLogSchema.index({ status: 1 });
IngestionLogSchema.index({ operation: 1 });
IngestionLogSchema.index({ "error.code": 1 });
IngestionLogSchema.index({ createdAt: -1 });

// TTL index: Delete logs older than 90 days
IngestionLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 },
);
