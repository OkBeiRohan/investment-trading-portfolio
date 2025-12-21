import { startTelemetry } from './config/sentry.config';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { initObservability, OtelLogger } from '@repo/observability';

initObservability('market-feeder');

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    // CRITICAL: Start Sentry BEFORE creating NestJS app
    startTelemetry();
    logger.log('Sentry instrumentation started');

    // Create gRPC microservice (not hybrid HTTP)
    const app = await NestFactory.createMicroservice<MicroserviceOptions>(
      AppModule,
      {
        transport: Transport.GRPC,
        options: {
          package: 'historical_data',
          protoPath: require.resolve('@repo/schema/proto/historical-data'),
          url: `0.0.0.0:${process.env.GRPC_PORT || 50052}`,
        },
        bufferLogs: true,
      },
    );

    app.useLogger(new OtelLogger('market-feeder'));

    await app.listen();
    logger.log(
      `gRPC microservice running on port ${process.env.GRPC_PORT || 50052}`,
    );
  } catch (error) {
    logger.error('Failed to start Market Feeder', error);
    process.exit(1);
  }
}
void bootstrap();
