import { Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: true })
export class Passkey extends Document {}

export const PasskeySchema = SchemaFactory.createForClass(Passkey);
