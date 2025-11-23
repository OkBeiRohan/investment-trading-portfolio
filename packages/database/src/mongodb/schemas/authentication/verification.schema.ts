import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { IVerification } from "@repo/schema";

@Schema({ timestamps: true })
export class Verification extends Document implements IVerification {
  id: string;

  @Prop({ required: true, index: true })
  identifier: string;

  @Prop({ required: true, index: true })
  value: string;

  @Prop({ required: true, index: true })
  expiresAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const VerificationSchema = SchemaFactory.createForClass(Verification);

VerificationSchema.index({ identifier: 1, value: 1 });
VerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
