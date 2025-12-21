import { LoggerService, Injectable } from '@nestjs/common';
import { context, trace } from '@opentelemetry/api';
import * as winston from 'winston';

@Injectable()
export class OtelLogger implements LoggerService {
  private logger: winston.Logger;

  constructor(serviceName: string) {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: serviceName },
      transports: [
        new winston.transports.Console(),
      ],
    });
  }

  log(message: any, ...optionalParams: any[]) {
    this.printLog('info', message, ...optionalParams);
  }

  error(message: any, ...optionalParams: any[]) {
    this.printLog('error', message, ...optionalParams);
  }

  warn(message: any, ...optionalParams: any[]) {
    this.printLog('warn', message, ...optionalParams);
  }

  debug(message: any, ...optionalParams: any[]) {
    this.printLog('debug', message, ...optionalParams);
  }

  verbose(message: any, ...optionalParams: any[]) {
    this.printLog('verbose', message, ...optionalParams);
  }

  private printLog(level: string, message: any, ...optionalParams: any[]) {
    const currentSpan = trace.getSpan(context.active());
    const traceId = currentSpan?.spanContext().traceId;
    const spanId = currentSpan?.spanContext().spanId;

    this.logger.log({
      level,
      message,
      traceId,
      spanId,
      ...optionalParams,
    });
  }
}
