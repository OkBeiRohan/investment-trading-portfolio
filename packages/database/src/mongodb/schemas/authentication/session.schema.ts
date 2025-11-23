import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { ISession } from "@repo/schema";
import { User } from "../user/user.schema";
import { Organization } from "../organization";

@Schema({ timestamps: true })
export class Session extends Document implements ISession {
  id: string;

  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  userId: string;

  @Prop({ required: true, index: true })
  token: string;

  @Prop({ required: true, index: true })
  expiresAt: Date;

  @Prop({ required: false })
  ipAddress?: string | null;

  @Prop({ required: false })
  userAgent?: string | null;

  @Prop({
    type: Types.ObjectId,
    ref: Organization.name,
    required: false,
  })
  activeOrganizationId?: string;

  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    required: false,
  })
  impersonatedBy?: string;

  @Prop({ required: false })
  lastActivityAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

SessionSchema.index({ token: 1 }, { unique: true });
SessionSchema.index({ userId: 1 });
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
