import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TRPCModule } from 'nestjs-trpc';
import { MongoDBModule } from '@repo/database';

@Module({
  imports: [
    TRPCModule.forRoot({
      autoSchemaFile: '../../packages/trpc-router/src',
    }),
    MongoDBModule.forRoot({
      mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
