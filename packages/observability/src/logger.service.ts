import { LoggerService, Injectable, ConsoleLogger } from "@nestjs/common";
import { context, trace } from "@opentelemetry/api";

@Injectable()
export class OtelLogger extends ConsoleLogger implements LoggerService {
  constructor(serviceName: string) {
    super(serviceName);
  }

  log(message: any, ...optionalParams: any[]) {
    super.log(this.enrichMessage(message), ...optionalParams);
  }

  error(message: any, ...optionalParams: any[]) {
    super.error(this.enrichMessage(message), ...optionalParams);
  }

  warn(message: any, ...optionalParams: any[]) {
    super.warn(this.enrichMessage(message), ...optionalParams);
  }

  debug(message: any, ...optionalParams: any[]) {
    super.debug(this.enrichMessage(message), ...optionalParams);
  }

  verbose(message: any, ...optionalParams: any[]) {
    super.verbose(this.enrichMessage(message), ...optionalParams);
  }

  private enrichMessage(message: any): any {
    const currentSpan = trace.getSpan(context.active());
    const traceId = currentSpan?.spanContext().traceId;
    const spanId = currentSpan?.spanContext().spanId;

    if (traceId || spanId) {
      const traceInfo = [
        traceId ? `trace=${traceId}` : null,
        spanId ? `span=${spanId}` : null,
      ]
        .filter(Boolean)
        .join(" ");

      return typeof message === "string"
        ? `${message} [${traceInfo}]`
        : message;
    }

    return message;
  }
}
