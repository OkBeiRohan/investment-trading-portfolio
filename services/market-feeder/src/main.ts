import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
// import { otelSDK, OtelLogger } from '@repo/observability';

async function bootstrap() {
  // otelSDK.start();

  try {
    const grpcPort = parseInt(process.env.GRPC_PORT || '50052', 10);

    const app = await NestFactory.createMicroservice<MicroserviceOptions>(
      AppModule,
      {
        transport: Transport.GRPC,
        options: {
          package: 'historical_data',
          protoPath: require.resolve('@repo/schema/proto/historical-data'),
          host: '0.0.0.0',
          port: grpcPort,
        },
        bufferLogs: true,
      },
    );

    const logger = app.get(Logger);
    // app.useLogger(logger);

    app.enableShutdownHooks();

    await app.listen();
    logger.log(`gRPC microservice running on port ${grpcPort}`);
  } catch (error) {
    console.error('Failed to start Market Feeder', error);
    process.exit(1);
  }
}
void bootstrap();
