import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '@repo/authentication';
import { DevtoolsModule } from '@nestjs/devtools-integration';
import { HealthModule } from './health/health.module';
import { UserModule } from './user/user.module';
import { TRPCModule } from '@mguay/nestjs-trpc';
import { AppContext } from './app.context';

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
          : '../../packages/schema/src/api',
      context: AppContext,
      basePath: '/api/trpc',
    }),
    AuthModule,
    HealthModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppContext],
})
export class AppModule {}
