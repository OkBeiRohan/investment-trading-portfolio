import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '@repo/authentication';
import { DevtoolsModule } from '@nestjs/devtools-integration';
import { HealthModule } from './health/health.module';
import { UserModule } from './user/user.module';
import { TRPCModule } from 'nestjs-trpc-v2';
import { AppContext } from './app.context';
import { AppRouter } from './app.router';

const DevelopmentUtils = [
  ...(process.env.DEVTOOLS === 'true'
    ? [
        DevtoolsModule.register({
          http: process.env.NODE_ENV !== 'production',
        }),
      ]
    : []),
];

@Module({
  imports: [
    ...DevelopmentUtils,
    TRPCModule.forRoot({
      autoSchemaFile:
        process.env.DEVTOOLS === 'true'
          ? undefined
          : '../../packages/trpc/src/server',
      context: AppContext,
      basePath: '/api/trpc',
    }),
    AuthModule,
    HealthModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppContext, AppRouter],
})
export class AppModule {}
