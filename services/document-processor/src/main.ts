import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { otelSDK, OtelLogger } from '@repo/observability';

async function bootstrap() {
  otelSDK.start();
  const grpcPort = parseInt(process.env.GRPC_PORT || '50053', 10);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'document_processor',
        protoPath: require.resolve('@repo/schema/proto/document-processor'),
        host: '0.0.0.0',
        port: grpcPort,
      },
      bufferLogs: true,
    },
  );

  const logger = app.get(OtelLogger);
  app.useLogger(logger);
  app.enableShutdownHooks();

  await app.listen();
}
void bootstrap();
