/**
 * Custom Telemetry Service
 * Layer-specific span tracking and audit logging
 */

import { Injectable, Logger } from '@nestjs/common';
import { trace, context, Span, SpanStatusCode } from '@opentelemetry/api';
import { QuestDBService } from '@repo/database';

export enum Layer {
  PERCEPTION = 'perception',
  CORTEX = 'cortex',
  PREDICTION = 'prediction',
  COGNITION = 'cognition',
  EXECUTION = 'execution',
  MEMORY = 'memory',
  CONTROL = 'control',
}

export interface LayerSpanOptions {
  layer: Layer;
  operation: string;
  attributes?: Record<string, string | number | boolean>;
}

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);
  private readonly tracer = trace.getTracer('market-feeder');

  constructor(private readonly questdbService: QuestDBService) {}

  /**
   * Create a layer-specific span
   * Automatically logs to system_audit table
   */
  async executeWithLayerSpan<T>(
    options: LayerSpanOptions,
    fn: (span: Span) => Promise<T>,
  ): Promise<T> {
    const { layer, operation, attributes = {} } = options;

    return this.tracer.startActiveSpan(
      `${layer}.${operation}`,
      {
        attributes: {
          'layer.name': layer,
          'layer.operation': operation,
          ...attributes,
        },
      },
      async (span) => {
        const traceId = span.spanContext().traceId;
        const spanId = span.spanContext().spanId;

        this.logger.debug(
          `[${layer}] ${operation} started (trace_id: ${traceId}, span_id: ${spanId})`,
        );

        try {
          const result = await fn(span);

          // Success: log to audit table
          await this.logToAudit({
            traceId,
            spanId,
            layer,
            operation,
            status: 'success',
            attributes,
          });

          span.setStatus({ code: SpanStatusCode.OK });
          span.end();

          return result;
        } catch (error) {
          // Error: log to audit table with error details
          await this.logToAudit({
            traceId,
            spanId,
            layer,
            operation,
            status: 'error',
            errorMessage: (error as Error).message,
            attributes,
          });

          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (error as Error).message,
          });
          span.recordException(error as Error);
          span.end();

          throw error;
        }
      },
    );
  }

  /**
   * Get current trace_id from active span
   */
  getCurrentTraceId(): string | undefined {
    const span = trace.getActiveSpan();
    return span?.spanContext().traceId;
  }

  /**
   * Log operation to QuestDB system_audit table
   */
  private async logToAudit(params: {
    traceId: string;
    spanId: string;
    layer: string;
    operation: string;
    status: 'success' | 'error';
    errorMessage?: string;
    attributes?: Record<string, any>;
  }): Promise<void> {
    try {
      await this.questdbService.writeAuditLog({
        trace_id: params.traceId,
        span_id: params.spanId,
        service_name: 'market-feeder',
        layer_name: params.layer,
        operation_name: params.operation,
        status: params.status,
        error_message: params.errorMessage || null,
        metadata: JSON.stringify(params.attributes || {}),
        timestamp: Date.now(),
      });
    } catch (error) {
      this.logger.error('Failed to write audit log', error);
      // Don't throw - audit logging should not break the application
    }
  }
}
