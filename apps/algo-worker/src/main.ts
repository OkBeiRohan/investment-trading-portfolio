import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { otelSDK, OtelLogger } from '@repo/observability';

async function bootstrap() {
  otelSDK.start();

  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(OtelLogger);
  app.useLogger(logger);

  app.enableShutdownHooks();

  await app.init();
}
void bootstrap();
