import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { QuestDBModule, RedisModule } from "@repo/database";
import { AuthModule } from "@repo/authentication";
import { HistoricalDataModule } from "./historical-data/historical-data.module";
import { IngestionModule } from "./ingestion/ingestion.module";
import configuration from "./config/configuration";
import { FeatureComputationModule } from "./feature-computation/feature-computation.module";
import { StrikeSelectorModule } from "./strike-selector/strike-selector.module";
import { DatasetGenerationModule } from "./dataset-generation/dataset-generation.module";

@Module({
  imports: [
    AuthModule,
    RedisModule,

    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: [".env.local", ".env"],
    }),

    ScheduleModule.forRoot(),

    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: ".",
      maxListeners: 20,
    }),

    QuestDBModule,
    IngestionModule,
    HistoricalDataModule,
    FeatureComputationModule,
    StrikeSelectorModule,
    DatasetGenerationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
