/**
 * Instrument Master Schema (MongoDB)
 * Rich metadata for operational monitoring and inventory
 * 
 * Purpose: Track data availability, fetch status, errors
 * QuestDB has minimal instrument_master for fast JOINs
 */

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type InstrumentDocument = HydratedDocument<Instrument>;

/**
 * Data availability info discovered during fetching
 */
@Schema({ _id: false })
export class DataAvailability {
    @Prop()
    dailyStartDate?: Date;

    @Prop()
    dailyEndDate?: Date;

    @Prop({ default: 0 })
    dailyCandleCount!: number;

    @Prop()
    minuteStartDate?: Date;

    @Prop()
    minuteEndDate?: Date;

    @Prop({ default: 0 })
    minuteCandleCount!: number;

    @Prop()
    discoveredAt?: Date;
}

const DataAvailabilitySchema = SchemaFactory.createForClass(DataAvailability);

/**
 * Fetch status tracking
 */
@Schema({ _id: false })
export class FetchStatus {
    @Prop({ enum: ["PENDING", "FETCHING", "COMPLETE", "ERROR", "PARTIAL"], default: "PENDING" })
    status!: "PENDING" | "FETCHING" | "COMPLETE" | "ERROR" | "PARTIAL";

    @Prop()
    lastFetchedAt?: Date;

    @Prop()
    lastSuccessAt?: Date;

    @Prop()
    lastErrorAt?: Date;

    @Prop()
    lastErrorMessage?: string;

    @Prop({ default: 0 })
    fetchAttempts!: number;

    @Prop({ default: 0 })
    successfulFetches!: number;

    @Prop({ default: 0 })
    failedFetches!: number;
}

const FetchStatusSchema = SchemaFactory.createForClass(FetchStatus);

/**
 * Feature computation status
 */
@Schema({ _id: false })
export class FeatureStatus {
    @Prop({ default: 0 })
    dailyFeaturesComputed!: number;

    @Prop({ default: 0 })
    minuteFeaturesComputed!: number;

    @Prop()
    lastComputedAt?: Date;

    @Prop({ default: 0 })
    invalidFeatureCount!: number;

    @Prop()
    lastInvalidReason?: string;
}

const FeatureStatusSchema = SchemaFactory.createForClass(FeatureStatus);

@Schema({
    collection: "instruments",
    timestamps: true,
})
export class Instrument {
    /**
     * Upstox instrument key (unique identifier)
     */
    @Prop({ required: true, unique: true, index: true })
    instrumentKey!: string;

    /**
     * Instrument type
     */
    @Prop({
        required: true,
        enum: ["INDEX", "EQUITY", "FUTURE", "OPTION"],
        index: true
    })
    instrumentType!: "INDEX" | "EQUITY" | "FUTURE" | "OPTION";

    /**
     * Exchange (NSE, BSE, MCX)
     */
    @Prop({ required: true })
    exchange!: string;

    /**
     * Segment (EQ, FO, INDEX)
     */
    @Prop({ required: true })
    segment!: string;

    /**
     * Trading symbol
     */
    @Prop({ required: true, index: true })
    tradingSymbol!: string;

    /**
     * Full name
     */
    @Prop({ required: true })
    name!: string;

    /**
     * ISIN code (equities only)
     */
    @Prop({ sparse: true })
    isin?: string;

    // ============= F&O FIELDS =============

    @Prop({ sparse: true, index: true })
    underlyingKey?: string;

    @Prop({ sparse: true })
    underlyingSymbol?: string;

    @Prop({ sparse: true, index: true })
    expiry?: Date;

    @Prop({ sparse: true })
    strikePrice?: number;

    @Prop({ enum: ["CE", "PE"], sparse: true })
    optionType?: "CE" | "PE";

    @Prop()
    lotSize?: number;

    @Prop()
    tickSize?: number;

    // ============= DATA INVENTORY =============

    @Prop({ type: DataAvailabilitySchema })
    dataAvailability?: DataAvailability;

    @Prop({ type: FetchStatusSchema })
    fetchStatus?: FetchStatus;

    @Prop({ type: FeatureStatusSchema })
    featureStatus?: FeatureStatus;

    // ============= FLAGS =============

    @Prop({ default: true })
    isActive!: boolean;

    @Prop({ default: false, index: true })
    isNifty50!: boolean;

    @Prop({ default: false, index: true })
    tradingEnabled!: boolean;

    @Prop({ default: false, index: true })
    dataCollectionEnabled!: boolean;

    @Prop()
    industry?: string;

    @Prop()
    notes?: string;

    @Prop({ type: Date })
    lastBodSyncAt?: Date;
}

export const InstrumentSchema = SchemaFactory.createForClass(Instrument);

InstrumentSchema.index({ instrumentType: 1, isActive: 1 });
InstrumentSchema.index({ isNifty50: 1, instrumentType: 1 });
InstrumentSchema.index({ "fetchStatus.status": 1 });
InstrumentSchema.index({ tradingEnabled: 1, isActive: 1 });
InstrumentSchema.index({ dataCollectionEnabled: 1, isActive: 1 });
