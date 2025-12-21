import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongoDBModule } from '@repo/database';
import { ObservabilityModule } from '@repo/observability';

@Module({
  imports: [MongoDBModule, ObservabilityModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
