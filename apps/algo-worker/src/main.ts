import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { otelSDK, OtelLogger } from '@repo/observability';

async function bootstrap() {
  otelSDK.start();

  const grpcPort = parseInt(process.env.GRPC_PORT || '50051', 10);
  const httpPort = parseInt(process.env.HTTP_PORT || '3001', 10);

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(OtelLogger);
  app.useLogger(logger);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'algo_worker',
      protoPath: require.resolve('@repo/schema/proto/algo-worker'),
      host: '0.0.0.0',
      port: grpcPort,
    },
  });

  app.enableShutdownHooks();

  await app.startAllMicroservices();
  await app.listen(httpPort);

  logger.log(`Algo Worker HTTP server running on port ${httpPort}`);
  logger.log(`Algo Worker gRPC microservice running on port ${grpcPort}`);
}
void bootstrap();
