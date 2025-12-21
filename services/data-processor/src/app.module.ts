import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ObservabilityModule } from '@repo/observability';

@Module({
  imports: [ObservabilityModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
