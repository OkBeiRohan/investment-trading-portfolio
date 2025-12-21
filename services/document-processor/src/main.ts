import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { initObservability, OtelLogger } from '@repo/observability';

initObservability('document-processor');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(new OtelLogger('document-processor'));
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
