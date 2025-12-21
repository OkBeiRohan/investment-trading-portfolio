/**
 * Custom Telemetry Service
 * Layer-specific span tracking and audit logging with Sentry
 */

import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
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

  constructor(private readonly questdbService: QuestDBService) {}

  /**
   * Create a layer-specific span with Sentry
   * Automatically logs to system_audit table
   */
  async executeWithLayerSpan<T>(
    options: LayerSpanOptions,
    fn: (span: Sentry.Span) => Promise<T>,
  ): Promise<T> {
    const { layer, operation, attributes = {} } = options;

    return Sentry.startSpan(
      {
        name: `${layer}.${operation}`,
        op: operation,
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

          return result;
        } catch (error) {
          // Error: log to audit table and report to Sentry
          await this.logToAudit({
            traceId,
            spanId,
            layer,
            operation,
            status: 'error',
            errorMessage: (error as Error).message,
            attributes,
          });

          // Sentry automatically captures exceptions in spans
          throw error;
        }
      },
    );
  }

  /**
   * Get current trace_id from active Sentry span
   */
  getCurrentTraceId(): string | undefined {
    const span = Sentry.getActiveSpan();
    return span?.spanContext().traceId;
  }

  /**
   * Set custom context for Sentry events
   */
  setContext(key: string, value: Record<string, any>): void {
    Sentry.setContext(key, value);
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
