import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TRPCModule } from 'nestjs-trpc';
import {
  AccountRepository,
  MongoDBModule,
  OrganizationRepository,
  PasskeyRepository,
  SessionRepository,
  TwoFactorRepository,
  UserRepository,
  VerificationRepository,
} from '@repo/database';
import { AuthModule } from '@repo/authentication/nestjs';
import { mongoAdapter } from '@repo/authentication';

@Module({
  imports: [
    TRPCModule.forRoot({
      autoSchemaFile: '../../packages/trpc-router/src',
    }),
    MongoDBModule.forRoot({
      mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    }),
    AuthModule.forRoot({
      adapter: (options) => {
        // This will be injected properly in a real app
        // For now, we'll create it in the module
        return mongoAdapter(
          {
            users: new UserRepository(null as any),
            sessions: new SessionRepository(null as any),
            accounts: new AccountRepository(null as any),
            verifications: new VerificationRepository(null as any),
            organizations: new OrganizationRepository(
              null as any,
              null as any,
              null as any,
            ),
            twoFactors: new TwoFactorRepository(null as any),
            passkeys: new PasskeyRepository(null as any),
          },
          { debugLogs: process.env.NODE_ENV === 'development' },
        )(options);
      },
      baseURL: process.env.APP_URL || 'http://localhost:4000',
      secret: process.env.AUTH_SECRET || 'your-secret-key-change-in-production',
      appName: 'My App',
      trustedOrigins: [process.env.FRONTEND_URL || 'http://localhost:3000'],
      emailProvider: {
        sendVerificationEmail: async ({ user, url, token }) => {
          // TODO: Implement email sending (e.g., using nodemailer, sendgrid, etc.)
          console.log('Send verification email to:', user.email, 'URL:', url);
        },
        sendResetPasswordEmail: async ({ user, url, token }) => {
          console.log('Send password reset email to:', user.email, 'URL:', url);
        },
      },
      organizationConfig: {
        sendInvitationEmail: async (data) => {
          console.log('Send invitation email to:', data.email);
        },
      },
      twoFactorConfig: {
        sendOTP: async (data) => {
          console.log('Send OTP to user:', data.user.email, 'OTP:', data.otp);
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
        window: 60 * 1000, // 1 minute
        max: 100, // 100 requests per minute
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
