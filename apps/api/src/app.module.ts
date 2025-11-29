import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TRPCModule } from 'nestjs-trpc';
import { AuthModule } from '@repo/authentication';
import { DevtoolsModule } from '@nestjs/devtools-integration';

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
      basePath: '/api/trpc',
    }),
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
