import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

@Schema({ timestamps: true, collection: "feature_configs" })
export class FeatureConfig extends Document {
  @Prop({ required: true, unique: true, index: true })
  featureName: string;

  @Prop({
    required: true,
    index: true,
    enum: [
      "index_breadth",
      "nifty_future",
      "options",
      "volatility",
      "order_flow",
      "price_structure",
      "momentum",
      "moving_averages",
      "bollinger",
      "regime",
      "time_context",
      "global_macro",
      "pre_market",
      "mcx",
    ],
  })
  category: string;

  @Prop({ default: true })
  enabled: boolean;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  parameters: Record<string, any>;

  @Prop({ required: true, enum: [0, 1, 2, 3, 4] })
  tier: number;

  @Prop({
    enum: ["tick", "1s", "1m", "5m", "eod"],
    default: "1m",
  })
  computeFrequency: string;

  @Prop()
  description?: string;

  @Prop({ type: [String], default: [] })
  dependencies: string[];

  createdAt: Date;
  updatedAt: Date;
}

export const FeatureConfigSchema =
  SchemaFactory.createForClass(FeatureConfig);
