import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '@repo/authentication';
import { DevtoolsModule } from '@nestjs/devtools-integration';
import { HealthModule } from './health/health.module';
import { UserModule } from './user/user.module';
import { TRPCModule } from 'nestjs-trpc';
import { AppContext } from './app.context';

@Module({
  imports: [
    DevtoolsModule.register({
      http: process.env.NODE_ENV !== 'production',
    }),
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
  providers: [AppService],
})
export class AppModule {}
