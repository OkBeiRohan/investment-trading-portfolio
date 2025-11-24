import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TRPCModule } from 'nestjs-trpc';
import {
  AccountRepository,
  MongoDBModule,
  OrganizationRepository,
  PasskeyRepository,
  RedisModule,
  SessionRepository,
  TwoFactorRepository,
  UserRepository,
  VerificationRepository,
} from '@repo/database';
import { AuthModule } from '@repo/authentication/nestjs';
import { BetterAuthAdapterFactory } from '@repo/authentication';

@Module({
  imports: [
    TRPCModule.forRoot({
      autoSchemaFile: '../../packages/trpc-router/src',
    }),
    MongoDBModule.forRoot({
      mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    }),
    RedisModule.forRoot({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    }),
    AuthModule.forRootAsync({
      imports: [MongoDBModule],
      useFactory: (adapterFactory: BetterAuthAdapterFactory) => ({
        adapter: adapterFactory.createAdapter(
          process.env.NODE_ENV === 'development',
        ),
        baseURL: process.env.APP_URL || 'http://localhost:4000',
        secret:
          process.env.AUTH_SECRET || 'your-secret-key-change-in-production',
        appName: 'My App',
        trustedOrigins: [process.env.FRONTEND_URL || 'http://localhost:3000'],
        emailProvider: {
          sendVerificationEmail: async ({ user, url, token }) => {
            console.log('Send verification email to:', user.email, 'URL:', url);
            // TODO: Implement email sending
          },
          sendResetPasswordEmail: async ({ user, url, token }) => {
            console.log(
              'Send password reset email to:',
              user.email,
              'URL:',
              url,
            );
            // TODO: Implement email sending
          },
        },
        organizationConfig: {
          sendInvitationEmail: async (data) => {
            console.log('Send invitation email to:', data.email);
            // TODO: Implement email sending
          },
        },
        twoFactorConfig: {
          sendOTP: async (data) => {
            console.log('Send OTP to user:', data.user.email, 'OTP:', data.otp);
            // TODO: Implement OTP sending
          },
        },
        socialProviders: {
          google: process.env.GOOGLE_CLIENT_ID
            ? {
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
              }
            : undefined,
          github: process.env.GITHUB_CLIENT_ID
            ? {
                clientId: process.env.GITHUB_CLIENT_ID,
                clientSecret: process.env.GITHUB_CLIENT_SECRET!,
              }
            : undefined,
        },
        rateLimit: {
          enabled: true,
          window: 60 * 1000,
          max: 100,
        },
      }),
      inject: [BetterAuthAdapterFactory],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
