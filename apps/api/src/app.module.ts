import { Module } from '@nestjs/common';
import { ConditionalModule, ConfigModule } from '@nestjs/config';
import { DevtoolsModule } from '@nestjs/devtools-integration';
import { ScheduleModule } from '@nestjs/schedule';
import { TRPCModule } from 'nestjs-trpc-v2';
import { AuthModule } from '@repo/authentication';
import { RedisModule } from '@repo/database';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { UserModule } from './user/user.module';
import { AdminModule } from './admin/admin.module';
import { MarketDataModule } from './market-data/market-data.module';
import { AppContext } from './app.context';
import { AppRouter } from './app.router';
import registerConfiguration from './environment/configuration';
import { TrpcAuthMiddleware } from './app.middleware';
import { ObservabilityModule } from '@repo/observability';

@Module({
  imports: [
    ObservabilityModule,
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true, load: [registerConfiguration] }),
    ConditionalModule.registerWhen(
      DevtoolsModule.register({
        http: true,
      }),
      'DEVTOOLS',
    ),
    TRPCModule.forRoot({
      // Disable schema auto-generation in production to save memory
      // Schema should be pre-generated during build
      autoSchemaFile:
        process.env.NODE_ENV === 'production' || process.env.DEVTOOLS === 'true'
          ? undefined
          : '../../packages/trpc/src/server',
      context: AppContext,
      basePath: '/api/trpc',
    }),
    AuthModule,
    RedisModule,
    HealthModule,
    UserModule,
    AdminModule,
    MarketDataModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppContext, TrpcAuthMiddleware, AppRouter],
})
export class AppModule { }
