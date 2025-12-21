import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { initObservability, OtelLogger } from '@repo/observability';

initObservability('algo-worker');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(new OtelLogger('algo-worker'));
  await app.init();
}
void bootstrap();
