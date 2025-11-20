import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { UpstoxEnv } from "@repo/schema";
import { Document } from "mongoose";

export type UpstoxTokenDocument = UpstoxToken & Document;

@Schema({ timestamps: true, collection: "upstox_tokens" })
export class UpstoxToken {
  @Prop({ required: true, unique: true, index: true })
  userId: string; // The UCC (User Client Code)

  @Prop({ required: true })
  encryptedAccessToken: string;

  @Prop({ required: true })
  iv: string; // Initialization Vector

  @Prop({ required: true })
  authTag: string; // GCM Auth Tag

  @Prop({ required: false })
  refreshToken?: string;

  @Prop({ required: true })
  expiry: Date; // Token validity limit

  @Prop({ required: true, enum: UpstoxEnv })
  environment: string;

  @Prop({ type: Object })
  metadata: Record<string, any>; // Store scopes, plan type (Basic/Plus)
}

export const UpstoxTokenSchema = SchemaFactory.createForClass(UpstoxToken);
