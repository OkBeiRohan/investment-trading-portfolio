export * from './tracing.service';
export * from './logger.service';
export * from './decorators/span.decorator'; // Keep our custom lightweight one or use nestjs-otel's
export * from './nest-observability.module';
export { Span as OtelSpan, TraceService } from 'nestjs-otel'; // Re-export nestjs-otel features
