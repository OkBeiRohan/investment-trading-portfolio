import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as Sentry from '@sentry/nestjs';
import type { Response } from 'express';

@Injectable()
export class TraceContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TraceContextInterceptor.name);

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const span = Sentry.getActiveSpan();
    const traceId = span?.spanContext().traceId;

    if (traceId && span) {
      // Attach trace_id to HTTP response headers
      try {
        const httpContext = ctx.switchToHttp().getResponse<Response>();
        if (httpContext && typeof httpContext.setHeader === 'function') {
          httpContext.setHeader('x-trace-id', traceId);
        }
      } catch {
        // Not an HTTP context (possibly gRPC)
      }

      this.logger.debug(`Request trace_id: ${traceId}`);
    }

    return next.handle().pipe(
      tap({
        error: (error: Error) => {
          this.logger.error(`Request failed (trace_id: ${traceId})`, error);
        },
      }),
    );
  }
}
