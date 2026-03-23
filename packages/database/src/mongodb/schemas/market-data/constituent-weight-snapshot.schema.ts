/**
 * Nifty 50 Constituent Weight Snapshot Schema (MongoDB)
 *
 * Stores monthly point-in-time weight snapshots from the HuggingFace dataset
 * (AMP4010/Historical_Nifty_50_Constituent_Weights_20Y).
 *
 * Each document represents one date's complete snapshot of all 50 constituent
 * weights, normalized to 100%. Non-constituents on that date have weight 0 and
 * are excluded from the embedded array.
 *
 * Date range: 2008-01-31 → present (rolling 20-year window, updated monthly).
 */

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type ConstituentWeightSnapshotDocument =
  HydratedDocument<ConstituentWeightSnapshot>;

@Schema({ _id: false })
export class ConstituentWeight {
  @Prop({ required: true })
  symbol!: string;

  /** Weight as a percentage of the index (0–100, up to 5 decimal places) */
  @Prop({ required: true })
  weightPct!: number;

  @Prop()
  sector?: string;
}

export const ConstituentWeightSchema =
  SchemaFactory.createForClass(ConstituentWeight);

@Schema({
  timestamps: true,
})
export class ConstituentWeightSnapshot {
  @Prop({ required: true, index: true })
  indexName!: string;

  /** Snapshot date (end-of-month or rebalancing event date) */
  @Prop({ required: true, index: true })
  date!: Date;

  /** Number of active constituents on this date */
  @Prop({ required: true })
  constituentCount!: number;

  /** Array of non-zero-weight constituents on this date */
  @Prop({ type: [ConstituentWeightSchema], required: true })
  constituents!: ConstituentWeight[];

  /**
   * Concentration metrics pre-computed at ingestion time.
   * HHI = sum of (weight/100)^2 across all constituents. Higher = more concentrated.
   */
  @Prop()
  hhi?: number;

  @Prop()
  top5WeightPct?: number;

  @Prop()
  top10WeightPct?: number;

  @Prop({ default: "huggingface_amp4010" })
  source!: string;
}

export const ConstituentWeightSnapshotSchema = SchemaFactory.createForClass(
  ConstituentWeightSnapshot,
);

ConstituentWeightSnapshotSchema.index(
  { indexName: 1, date: -1 },
  { unique: true },
);
ConstituentWeightSnapshotSchema.index({ "constituents.symbol": 1, date: -1 });
