import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { otelSDK, OtelLogger } from '@repo/observability';

async function bootstrap() {
  otelSDK.start();

  const grpcPort = parseInt(process.env.GRPC_PORT || '50051', 10);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'algo_worker',
        protoPath: require.resolve('@repo/schema/proto/algo-worker'),
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
  logger.log(`Algo Worker gRPC microservice running on port ${grpcPort}`);
}
void bootstrap();
