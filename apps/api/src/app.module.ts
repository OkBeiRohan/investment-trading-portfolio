import { Module } from '@nestjs/common';
import { ConditionalModule, ConfigModule } from '@nestjs/config';
import { DevtoolsModule } from '@nestjs/devtools-integration';
import { TRPCModule } from '@mguay/nestjs-trpc';
import { AuthModule } from '@repo/authentication';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { UserModule } from './user/user.module';
import { AppContext } from './app.context';
import { AppRouter } from './app.router';
import registerConfiguration from './environment/configuration';

@Module({
  imports: [
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
    HealthModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppContext, AppRouter],
})
export class AppModule {}
