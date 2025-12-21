import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';
import { startTelemetry } from './config/sentry.config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    // CRITICAL: Start Sentry BEFORE creating NestJS app
    startTelemetry();
    logger.log('Sentry instrumentation started');

    const app = await NestFactory.createMicroservice<MicroserviceOptions>(
      AppModule,
      {
        transport: Transport.GRPC,
        options: {
          package: 'historical_data',
          protoPath: join(__dirname, '../proto/historical-data.proto'),
          url: `0.0.0.0:${process.env.GRPC_PORT || 50051}`,
        },
      },
    );

    await app.listen();

    logger.log(`gRPC server running on port ${process.env.GRPC_PORT || 50051}`);
  } catch (error) {
    logger.error('Failed to start Market Feeder', error);
    process.exit(1);
  }
}
void bootstrap();
