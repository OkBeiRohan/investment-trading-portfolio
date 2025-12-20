import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import type { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import {
  CompositePropagator,
  W3CTraceContextPropagator,
  W3CBaggagePropagator,
} from '@opentelemetry/core';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import type { IncomingMessage } from 'http';

/**
 * Initialize OpenTelemetry SDK
 * Auto-instruments NestJS and HTTP calls
 */
export async function initializeOpenTelemetry(): Promise<NodeSDK> {
  // Dynamic import to avoid type-only error
  const { Resource } = await import('@opentelemetry/resources');

  const resource = Resource.default().merge(
    new Resource({
      [ATTR_SERVICE_NAME]: 'market-feeder',
      [ATTR_SERVICE_VERSION]: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      'deployment.target': process.env.DEPLOYMENT_TARGET || 'local',
    }),
  );

  // OTLP gRPC exporter (sends to Jaeger/Tempo/etc.)
  const traceExporter = new OTLPTraceExporter({
    url:
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
      'http://localhost:4317/v1/traces',
    headers: {
      'x-service': 'market-feeder',
    },
  });

  const sdk = new NodeSDK({
    resource,
    spanProcessors: [new BatchSpanProcessor(traceExporter)],
    instrumentations: [
      // Auto-instrument NestJS controllers, services, interceptors
      new NestInstrumentation(),
      // Auto-instrument HTTP requests (Upstox API calls)
      new HttpInstrumentation({
        ignoreIncomingRequestHook: (request: IncomingMessage) => {
          // Ignore health checks
          return request.url?.includes('/health') || false;
        },
        requestHook: (span) => {
          // Add custom attributes for market data requests
          span.setAttribute('market.provider', 'upstox');
        },
      }),
    ],
    // Propagate trace context across services (gRPC, Redis, HTTP)
    textMapPropagator: new CompositePropagator({
      propagators: [
        new W3CTraceContextPropagator(),
        new W3CBaggagePropagator(),
      ],
    }),
  });

  return sdk;
}

/**
 * Start OpenTelemetry instrumentation
 * Call this BEFORE creating NestJS application
 */
export async function startTelemetry(): Promise<NodeSDK> {
  const sdk = initializeOpenTelemetry();

  try {
    await sdk.start();
    console.log('[Telemetry] OpenTelemetry started successfully');

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      try {
        await sdk.shutdown();
        console.log('[Telemetry] OpenTelemetry shutdown complete');
      } catch (error) {
        console.error('[Telemetry] Error shutting down OpenTelemetry:', error);
      }
    });

    return sdk;
  } catch (error) {
    console.error('[Telemetry] Failed to start OpenTelemetry:', error);
    throw error;
  }
}
