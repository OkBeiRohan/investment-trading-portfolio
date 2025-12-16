import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { IPasskey } from "@repo/schema";
import { Document, Types } from "mongoose";
import { User } from "../user/user.schema";

@Schema({ timestamps: true })
export class Passkey extends Document implements IPasskey {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  userId: string;

  @Prop({})
  name?: string;

  @Prop({ required: true })
  publicKey: string;

  @Prop({ required: true, unique: true, index: true })
  credentialID: string;

  @Prop({ required: true, default: 0 })
  counter: number;

  @Prop({ required: true })
  deviceType: string;

  @Prop({ required: true, default: false })
  backedUp: boolean;

  @Prop({})
  transports?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const PasskeySchema = SchemaFactory.createForClass(Passkey);
