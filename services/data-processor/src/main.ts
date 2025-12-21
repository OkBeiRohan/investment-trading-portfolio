import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { initObservability, OtelLogger } from '@repo/observability';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

initObservability('data-processor');

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'data_processor',
      },
      bufferLogs: true,
    },
  );
  app.useLogger(new OtelLogger('data-processor'));
  await app.listen();
}
void bootstrap();
