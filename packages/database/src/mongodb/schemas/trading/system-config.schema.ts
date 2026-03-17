import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

@Schema({ timestamps: true, collection: "system_configs" })
export class SystemConfig extends Document {
  @Prop({ required: true, unique: true, index: true })
  key: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  value: any;

  @Prop({
    required: true,
    index: true,
    enum: [
      "market",
      "trading",
      "data",
      "training",
      "system",
      "notification",
    ],
  })
  category: string;

  @Prop({ required: true })
  description: string;

  @Prop({
    enum: ["string", "number", "boolean", "json", "array"],
    default: "string",
  })
  valueType: string;

  @Prop({ default: false })
  isSecret: boolean;

  @Prop()
  updatedBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const SystemConfigSchema =
  SchemaFactory.createForClass(SystemConfig);
