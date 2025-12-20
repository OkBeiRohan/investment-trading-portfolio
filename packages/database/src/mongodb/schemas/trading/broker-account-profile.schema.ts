import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { IBrokerAccountProfile } from "@repo/schema";

@Schema({ _id: false })
export class BrokerAccountProfile implements IBrokerAccountProfile {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  userName: string;

  @Prop({ required: true })
  userType: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  poa: boolean;
}

export const BrokerAccountProfileSchema =
  SchemaFactory.createForClass(BrokerAccountProfile);
