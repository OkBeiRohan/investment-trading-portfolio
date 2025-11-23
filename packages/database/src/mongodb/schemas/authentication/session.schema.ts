import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { ISession } from "@repo/schema";
import { User } from "../user/user.schema";

@Schema({ timestamps: true })
export class Session extends Document implements ISession {
  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  userId: Types.ObjectId;

  @Prop({ required: true })
  token: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ required: false })
  ipAddress?: string | null;

  @Prop({ required: false })
  userAgent?: string | null;

  @Prop({ required: false })
  lastActivityAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

SessionSchema.index({ token: 1 });
SessionSchema.index({ userId: 1 });
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
