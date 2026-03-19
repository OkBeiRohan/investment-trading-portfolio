/**
 * Nifty 50 Constituent Change Schema (MongoDB)
 * Tracks historical changes to Nifty 50 composition
 *
 * Purpose: Replace hardcoded values with dynamic data
 */

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type ConstituentChangeDocument = HydratedDocument<ConstituentChange>;

@Schema({
  timestamps: true,
})
export class ConstituentChange {
  /**
   * Index name (e.g., "Nifty 50", "Nifty Bank")
   */
  @Prop({ required: true, index: true })
  indexName!: string;

  /**
   * Effective date of the change
   */
  @Prop({ required: true, index: true })
  effectiveDate!: Date;

  /**
   * Change type
   */
  @Prop({ required: true, enum: ["ADD", "REMOVE", "REPLACE"] })
  changeType!: "ADD" | "REMOVE" | "REPLACE";

  // ============= ADDED INSTRUMENT =============

  @Prop({ sparse: true })
  addedInstrumentKey?: string;

  @Prop({ sparse: true })
  addedSymbol?: string;

  @Prop({ sparse: true })
  addedCompanyName?: string;

  @Prop({ sparse: true })
  addedIsin?: string;

  // ============= REMOVED INSTRUMENT =============

  @Prop({ sparse: true })
  removedInstrumentKey?: string;

  @Prop({ sparse: true })
  removedSymbol?: string;

  @Prop({ sparse: true })
  removedCompanyName?: string;

  @Prop({ sparse: true })
  removedIsin?: string;

  // ============= WEIGHT DATA =============

  /**
   * Weight of added stock at time of inclusion (% of index)
   */
  @Prop()
  addedWeightPct?: number;

  /**
   * Weight of removed stock at time of removal (% of index)
   */
  @Prop()
  removedWeightPct?: number;

  /**
   * Sector of added company
   */
  @Prop()
  addedSector?: string;

  /**
   * Sector of removed company
   */
  @Prop()
  removedSector?: string;

  // ============= METADATA =============

  /**
   * Industry of added company
   * @deprecated Use addedSector instead
   */
  @Prop()
  industry?: string;

  /**
   * Reason for change (if known)
   */
  @Prop()
  reason?: string;

  /**
   * Source of information
   */
  @Prop()
  source?: string;

  /**
   * Notes
   */
  @Prop()
  notes?: string;
}

export const ConstituentChangeSchema =
  SchemaFactory.createForClass(ConstituentChange);

// Indexes
ConstituentChangeSchema.index({ indexName: 1, effectiveDate: -1 });
ConstituentChangeSchema.index({ addedSymbol: 1, effectiveDate: -1 });
ConstituentChangeSchema.index({ removedSymbol: 1, effectiveDate: -1 });
