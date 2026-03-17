import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

@Schema({ collection: "audit_logs" })
export class AuditLog extends Document {
  @Prop({ required: true, index: true })
  action: string;

  @Prop({
    required: true,
    index: true,
    enum: ["auth", "trading", "admin", "data", "training", "system"],
  })
  category: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop()
  targetId?: string;

  @Prop()
  targetType?: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  details: Record<string, any>;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  @Prop({ type: Date, default: Date.now, index: true })
  timestamp: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 365 * 24 * 60 * 60 },
);
