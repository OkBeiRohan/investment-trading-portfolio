import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { ITwoFactor } from "@repo/schema";
import { User } from "../user/user.schema";

@Schema({ timestamps: true })
export class TwoFactor extends Document implements ITwoFactor {
  id: string;

  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    required: true,
  })
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
