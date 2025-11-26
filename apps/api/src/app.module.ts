import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TRPCModule } from 'nestjs-trpc';
import { AuthModule, AuthService } from '@repo/authentication';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { DevtoolsModule } from '@nestjs/devtools-integration';

@Module({
  imports: [
    DevtoolsModule.register({
      http: process.env.NODE_ENV !== 'production',
    }),
    TRPCModule.forRoot({
      autoSchemaFile: '../../packages/trpc-router/src/server',
    }),
    BetterAuthModule.forRootAsync({
      imports: [AuthModule],
      useFactory: (authService: AuthService) => ({
        auth: authService.getAuthInstance(),
      }),
      inject: [AuthService],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
