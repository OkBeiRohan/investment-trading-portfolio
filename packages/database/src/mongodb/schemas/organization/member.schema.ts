import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import {
  IMember,
  organisationRoleEnum,
  type OrganizationRole,
} from "@repo/schema";
import { Organization } from "./organization.schema";
import { User } from "../user/user.schema";

@Schema({
  timestamps: true,
})
export class Member extends Document implements IMember {
  id: string;

  @Prop({
    type: Types.ObjectId,
    ref: Organization.name,
    required: true,
    index: true,
  })
  organizationId: string;

  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
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
