import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { IAuthProvider } from "@repo/schema";

@Schema({ timestamps: true })
export class AuthProvider extends Document implements IAuthProvider {
  @Prop({ required: true })
  provider: string;

  @Prop({ required: true })
  providerId: string;

  @Prop({ required: true })
  accountId: string;

  @Prop({ required: false })
  accessToken?: string;

  @Prop({ required: false })
  refreshToken?: string;

  @Prop({ required: false })
  expiresAt?: Date;
}

export const AuthProviderSchema = SchemaFactory.createForClass(AuthProvider);

AuthProviderSchema.index({ provider: 1, providerId: 1 });
