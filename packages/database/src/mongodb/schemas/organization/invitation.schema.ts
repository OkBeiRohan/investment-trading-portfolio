import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import {
  IInvitation,
  invitationStatusEnum,
  organisationRoleEnum,
  type OrganizationRole,
  type InvitationStatus,
} from "@repo/schema";

@Schema({
  timestamps: true,
})
export class Invitation extends Document implements IInvitation {
  @Prop({ required: true, index: true, unique: true })
  id: string;

  @Prop({ required: true, index: true })
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

  @Prop({ required: true })
  inviterId: string;

  createdAt: Date;
  updatedAt: Date;
}

export const InvitationSchema = SchemaFactory.createForClass(Invitation);
InvitationSchema.index({ organizationId: 1, email: 1 });
InvitationSchema.index({ expiresAt: 1 });
