export { otelSDK } from "./tracing.service";
export * from "./logger/logger.options";
export * from "./logger/logger.module";
export { Logger as OtelLogger } from "nestjs-pino";
export * from "./nest-observability.module";
export { Span, TraceService } from "nestjs-otel"; // Re-export nestjs-otel features
