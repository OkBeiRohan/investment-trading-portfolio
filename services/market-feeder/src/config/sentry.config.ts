/**
 * Sentry Configuration
 * Error tracking, performance monitoring, and distributed tracing for market-feeder
 */

import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { version } from '../../package.json';

/**
 * Initialize Sentry SDK
 * Auto-instruments NestJS, HTTP, and provides OpenTelemetry integration
 */
export function initializeSentry(): void {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: version,

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Integrations
    integrations: [
      // CPU profiling (requires @sentry/profiling-node)
      nodeProfilingIntegration(),

      // Auto-instrument HTTP requests
      Sentry.httpIntegration(),
    ],

    // Context and metadata
    beforeSend(event) {
      // Add market-feeder specific context
      event.tags = {
        ...event.tags,
        service: 'market-feeder',
        layer: String(event.contexts?.layer?.name) || 'unknown',
      };

      // Filter out health check errors
      if (event.request?.url?.includes('/health')) {
        return null; // Don't send to Sentry
      }

      return event;
    },

    // Ignore expected errors
    ignoreErrors: [
      'HealthCheckError', // Health check timeouts
      'ECONNREFUSED', // Expected during development
    ],
  });
}

/**
 * Start Sentry instrumentation
 * Call this BEFORE creating NestJS application
 */
export function startTelemetry(): void {
  if (!process.env.SENTRY_DSN) {
    console.warn(
      '[Telemetry] SENTRY_DSN not configured. Error tracking disabled.',
    );
    return;
  }

  try {
    initializeSentry();
    console.log('[Telemetry] Sentry initialized successfully');

    // Graceful shutdown
    process.on('SIGTERM', () => {
      void Sentry.close(2000)
        .then(() => {
          console.log('[Telemetry] Sentry shutdown complete');
        })
        .catch((error: unknown) => {
          console.error('[Telemetry] Error shutting down Sentry:', error);
        });
    });
  } catch (error) {
    console.error('[Telemetry] Failed to start Sentry:', error);
    // Don't throw - allow app to start even if Sentry fails
  }
}
