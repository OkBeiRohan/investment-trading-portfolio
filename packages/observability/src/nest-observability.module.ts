import { Module } from "@nestjs/common";
import { OpenTelemetryModule } from "nestjs-otel";
import { LoggerModule } from "./logger/logger.module";

@Module({
  imports: [
    OpenTelemetryModule.forRoot({
      metrics: {
        hostMetrics: true,
      },
    }),
    LoggerModule,
  ],
  providers: [],
  exports: [OpenTelemetryModule, LoggerModule],
})
export class ObservabilityModule {}
