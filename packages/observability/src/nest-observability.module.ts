import { Module } from "@nestjs/common";
import { OpenTelemetryModule } from "nestjs-otel";

@Module({
  imports: [
    OpenTelemetryModule.forRoot({
      metrics: {
        hostMetrics: true,
      },
    }),
  ],
  exports: [OpenTelemetryModule],
})
export class ObservabilityModule {}
