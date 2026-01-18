/**
 * Instrument Master Schema (MongoDB)
 * Stores metadata about all instruments fetched from Upstox
 * 
 * Types:
 * - INDEX: Nifty 50, India VIX, etc.
 * - EQUITY: Individual stocks
 * - FUTURE: Futures contracts (current + expired)
 * - OPTION: Option contracts (current + expired)
 */

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type InstrumentDocument = HydratedDocument<Instrument>;

@Schema({
    collection: "instruments",
    timestamps: true,
    toJSON: { virtuals: true },
})
export class Instrument {
    /**
     * Upstox instrument key (e.g., 'NSE_EQ|INE002A01018', 'NSE_FO|54452|24-04-2025')
     */
    @Prop({ required: true, unique: true, index: true })
    instrumentKey!: string;

    /**
     * Exchange (NSE, BSE, MCX)
     */
    @Prop({ required: true, index: true })
    exchange!: string;

    /**
     * Segment (EQ, FO, INDEX)
     */
    @Prop({ required: true, index: true })
    segment!: string;

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
     * Trading symbol (e.g., RELIANCE, NIFTY, NIFTY23JAN22500CE)
     */
    @Prop({ required: true, index: true })
    tradingSymbol!: string;

    /**
     * Company/Instrument name
     */
    @Prop({ required: true })
    name!: string;

    /**
     * ISIN code (for equities)
     */
    @Prop({ sparse: true, index: true })
    isin?: string;

    /**
     * Exchange token
     */
    @Prop()
    exchangeToken?: string;

    // ============= FOR FUTURES/OPTIONS =============

    /**
     * Underlying instrument key (for F&O)
     */
    @Prop({ sparse: true, index: true })
    underlyingKey?: string;

    /**
     * Underlying symbol
     */
    @Prop({ sparse: true })
    underlyingSymbol?: string;

    /**
     * Expiry date (for F&O)
     */
    @Prop({ sparse: true, index: true })
    expiry?: Date;

    /**
     * Strike price (for options)
     */
    @Prop({ sparse: true, index: true })
    strikePrice?: number;

    /**
     * Option type (for options)
     */
    @Prop({ enum: ["CE", "PE"], sparse: true, index: true })
    optionType?: "CE" | "PE";

    /**
     * Lot size
     */
    @Prop()
    lotSize?: number;

    /**
     * Tick size
     */
    @Prop()
    tickSize?: number;

    /**
     * Freeze quantity
     */
    @Prop()
    freezeQuantity?: number;

    // ============= DATA AVAILABILITY =============

    /**
     * Earliest daily data available
     */
    @Prop()
    dailyDataStart?: Date;

    /**
     * Earliest minute data available
     */
    @Prop()
    minuteDataStart?: Date;

    /**
     * Last data fetch timestamp
     */
    @Prop()
    lastFetchedAt?: Date;

    /**
     * Data fetch status
     */
    @Prop({
        enum: ["PENDING", "FETCHING", "COMPLETE", "ERROR"],
        default: "PENDING"
    })
    fetchStatus?: "PENDING" | "FETCHING" | "COMPLETE" | "ERROR";

    /**
     * Total candles fetched
     */
    @Prop({ default: 0 })
    totalCandles?: number;

    // ============= FLAGS =============

    /**
     * Is this a current/active contract?
     */
    @Prop({ default: true })
    isActive!: boolean;

    /**
     * Is part of Nifty 50?
     */
    @Prop({ default: false, index: true })
    isNifty50!: boolean;

    /**
     * Industry sector
     */
    @Prop()
    industry?: string;
}

export const InstrumentSchema = SchemaFactory.createForClass(Instrument);

// Compound indexes for common queries
InstrumentSchema.index({ instrumentType: 1, isActive: 1 });
InstrumentSchema.index({ underlyingKey: 1, expiry: 1 });
InstrumentSchema.index({ isNifty50: 1, instrumentType: 1 });
InstrumentSchema.index({ optionType: 1, strikePrice: 1, expiry: 1 });
