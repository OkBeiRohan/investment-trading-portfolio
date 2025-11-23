import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import {
  IMember,
  organisationRoleEnum,
  type OrganizationRole,
} from "@repo/schema";

@Schema({
  timestamps: true,
})
export class Member extends Document implements IMember {
  @Prop({ required: true, index: true, unique: true })
  id: string;

  @Prop({
    required: true,
    index: true,
  })
  organizationId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({
    required: true,
    enum: organisationRoleEnum.options,
    default: organisationRoleEnum.enum.member,
  })
  role: OrganizationRole;

  createdAt: Date;
  updatedAt: Date;
}

export const MemberSchema = SchemaFactory.createForClass(Member);
MemberSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
