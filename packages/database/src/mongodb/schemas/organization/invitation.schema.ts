import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import {
  IInvitation,
  invitationStatusEnum,
  organisationRoleEnum,
  type OrganizationRole,
  type InvitationStatus,
} from "@repo/schema";
import { Organization } from "./organization.schema";
import { User } from "../user/user.schema";

@Schema({
  timestamps: true,
})
export class Invitation extends Document implements IInvitation {
  id: string;

  @Prop({
    type: Types.ObjectId,
    ref: Organization.name,
    required: true,
    index: true,
  })
  organizationId: string;

  @Prop({ required: true, index: true })
  email: string;

  @Prop({
    required: true,
    enum: organisationRoleEnum.options,
    default: organisationRoleEnum.enum.member,
  })
  role: OrganizationRole;

  @Prop({
    required: true,
    enum: invitationStatusEnum.options,
    default: invitationStatusEnum.enum.pending,
  })
  status: InvitationStatus;

  @Prop({ required: true, index: true })
  expiresAt: Date;

  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    required: true,
  })
  inviterId: string;

  createdAt: Date;
  updatedAt: Date;
}

export const InvitationSchema = SchemaFactory.createForClass(Invitation);
InvitationSchema.index({ organizationId: 1, email: 1 });
InvitationSchema.index({ expiresAt: 1 });
