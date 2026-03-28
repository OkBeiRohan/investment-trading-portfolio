import Pino, { Logger, LoggerOptions, TransportSingleOptions } from "pino";

const isDev = process.env.NODE_ENV !== "production";

const devTransport: TransportSingleOptions = {
  target: "pino-pretty",
  options: {
    colorize: true,
    translateTime: "SYS:HH:MM:ss.l",
    ignore: "pid,hostname",
    singleLine: false,
  },
};

export const loggerOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL || "info",
  transport: isDev ? devTransport : undefined,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
};

export const logger: Logger = Pino(loggerOptions);
