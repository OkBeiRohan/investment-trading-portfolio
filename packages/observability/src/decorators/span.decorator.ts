import { trace, SpanStatusCode } from '@opentelemetry/api';

/**
 * Decorator to create a custom OpenTelemetry span for a method.
 * Automatically handles async/sync methods and error recording.
 *
 * @param name Optional name for the span. Defaults to class.methodName
 */
export function Span(name?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;

    descriptor.value = function (...args: any[]) {
      const tracer = trace.getTracer('default');
      const spanName = name || `${className}.${propertyKey}`;

      return tracer.startActiveSpan(spanName, (span) => {
        try {
          const result = originalMethod.apply(this, args);

          if (result instanceof Promise) {
            return result
              .then((res) => {
                span.setStatus({ code: SpanStatusCode.OK });
                span.end();
                return res;
              })
              .catch((err) => {
                span.recordException(err);
                span.setStatus({
                  code: SpanStatusCode.ERROR,
                  message: err.message,
                });
                span.end();
                throw err;
              });
          }

          span.setStatus({ code: SpanStatusCode.OK });
          span.end();
          return result;
        } catch (err) {
          span.recordException(err);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: err instanceof Error ? err.message : String(err),
          });
          span.end();
          throw err;
        }
      });
    };

    return descriptor;
  };
}
