import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { ITwoFactor } from "@repo/schema";

@Schema({ timestamps: true })
export class TwoFactor extends Document implements ITwoFactor {
  @Prop({ required: true, index: true, unique: true })
  id: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  secret: string;

  @Prop({ required: true })
  backupCodes: string;

  createdAt: Date;
  updatedAt: Date;
}

export const TwoFactorSchema = SchemaFactory.createForClass(TwoFactor);
TwoFactorSchema.index({ userId: 1 });
