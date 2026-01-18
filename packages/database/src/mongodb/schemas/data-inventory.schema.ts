import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Data Inventory Schema
 * Tracks available data ranges for each instrument in QuestDB
 * Used to identify gaps and manage historical data fetching
 */
@Schema({ collection: 'data_inventory', timestamps: true })
export class DataInventory extends Document {
    @Prop({ required: true, index: true })
    instrumentKey: string;

    @Prop({ required: true })
    instrumentType: 'INDEX' | 'STOCK' | 'FUTURE' | 'OPTION';

    @Prop()
    underlying?: string;

    @Prop()
    tradingSymbol?: string;

    // Daily data availability
    @Prop({ type: Object })
    dailyData?: {
        startDate: Date;
        endDate: Date;
        totalCandles: number;
        lastUpdated: Date;
    };

    // Minute data availability
    @Prop({ type: Object })
    minuteData?: {
        startDate: Date;
        endDate: Date;
        totalCandles: number;
        lastUpdated: Date;
    };

    // Tick data availability (live only)
    @Prop({ type: Object })
    tickData?: {
        startDate: Date;
        endDate: Date;
        lastUpdated: Date;
    };

    // Missing data ranges
    @Prop({ type: [Object], default: [] })
    missingRanges: Array<{
        start: Date;
        end: Date;
        reason: string;
        intervalUnit: 'minutes' | 'days';
    }>;

    // Data quality metrics
    @Prop({ type: Object })
    qualityMetrics?: {
        totalGaps: number;
        gapDurationMinutes: number;
        lastQualityCheck: Date;
    };

    // Source tracking
    @Prop({ default: 'UPSTOX_V3' })
    source: 'UPSTOX_V3' | 'UPSTOX_EXPIRED' | 'MANUAL';

    // Status
    @Prop({ default: 'ACTIVE' })
    status: 'ACTIVE' | 'EXPIRED' | 'DELISTED';
}

export const DataInventorySchema = SchemaFactory.createForClass(DataInventory);

// Indexes
DataInventorySchema.index({ instrumentKey: 1 }, { unique: true });
DataInventorySchema.index({ instrumentType: 1 });
DataInventorySchema.index({ underlying: 1 });
DataInventorySchema.index({ 'dailyData.startDate': 1 });
DataInventorySchema.index({ 'minuteData.startDate': 1 });
