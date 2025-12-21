import { startTelemetry } from './config/sentry.config';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    // CRITICAL: Start Sentry BEFORE creating NestJS app
    startTelemetry();
    logger.log('Sentry instrumentation started');

    // Create hybrid HTTP + gRPC application
    const app = await NestFactory.create(AppModule);

    // Connect gRPC microservice
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.GRPC,
      options: {
        package: 'historical_data',
        protoPath: join(__dirname, 'proto/historical-data.proto'),
        url: `0.0.0.0:${process.env.GRPC_PORT || 50051}`,
      },
    });

    // Start all microservices
    await app.startAllMicroservices();
    logger.log(`gRPC server running on port ${process.env.GRPC_PORT || 50051}`);

    // Start HTTP server
    const port = process.env.PORT || 3002;
    await app.listen(port);
    logger.log(`HTTP server running on port ${port}`);
  } catch (error) {
    logger.error('Failed to start Market Feeder', error);
    process.exit(1);
  }
}
void bootstrap();
