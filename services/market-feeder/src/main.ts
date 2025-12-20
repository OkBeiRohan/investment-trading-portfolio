import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';
import { startTelemetry } from './config/telemetry.config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    // CRITICAL: Start OpenTelemetry BEFORE creating NestJS app
    await startTelemetry();
    logger.log('OpenTelemetry instrumentation started');

    const app = await NestFactory.create(AppModule);

    // Add gRPC microservice
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.GRPC,
      options: {
        package: 'historical_data',
        protoPath: join(__dirname, '../proto/historical-data.proto'),
        url: `0.0.0.0:${process.env.GRPC_PORT || 50051}`,
      },
    });

    await app.startAllMicroservices();
    logger.log(`gRPC server running on port ${process.env.GRPC_PORT || 50051}`);

    const port = process.env.PORT ?? 3002; // Market Feeder default port
    await app.listen(port);

    logger.log(`Market Feeder HTTP running on port ${port}`);
  } catch (error) {
    logger.error('Failed to start Market Feeder', error);
    process.exit(1);
  }
}
bootstrap();
