import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Import database modules
import { MongoDBModule, QuestDBModule, RedisModule } from '@repo/database';

@Module({
  imports: [MongoDBModule, QuestDBModule, RedisModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
