import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { IOrganization } from "@repo/schema";
import { Document } from "mongoose";

@Schema({ timestamps: true })
export class Organization extends Document implements IOrganization {
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: false })
  logo?: string;

  @Prop({ type: Object, required: false })
  metadata?: Record<string, string>;

  createdAt: Date;
  updatedAt: Date;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
OrganizationSchema.index({ slug: 1 }, { unique: true });
