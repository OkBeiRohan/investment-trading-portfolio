import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongoDBModule } from '@repo/database';

@Module({
  imports: [MongoDBModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
