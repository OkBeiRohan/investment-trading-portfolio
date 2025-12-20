import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { QuestDBModule } from '@repo/database';

@Module({
  imports: [QuestDBModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
