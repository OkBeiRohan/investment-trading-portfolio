import { NestFactory, PartialGraphHost } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { writeFileSync } from 'fs';
import { AppModule } from './app.module';
import { otelSDK, OtelLogger } from '@repo/observability';

async function bootstrap() {
  otelSDK.start();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    snapshot:
      process.env.DEVTOOLS === 'true' && process.env.NODE_ENV !== 'production',
    abortOnError: process.env.DEVTOOLS !== 'true',
    bufferLogs: true,
  });

  const logger = app.get(OtelLogger);
  app.useLogger(logger);

  const grpcPort = parseInt(process.env.GRPC_PORT || '50050', 10);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'api_gateway',
      protoPath: require.resolve('@repo/schema/proto/api-gateway'),
      host: '0.0.0.0',
      port: grpcPort,
    },
  });

  app.enableShutdownHooks();

  // Enable CORS for cross-origin requests from frontend
  let corsOrigins: string[] | undefined;
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.TRUSTED_ORIGINS) {
      throw new Error(
        'TRUSTED_ORIGINS environment variable must be set in production for CORS security.',
      );
    }
    corsOrigins = process.env.TRUSTED_ORIGINS.split(',')
      .map((o) => o.trim())
      .filter(Boolean);
  } else {
    corsOrigins = process.env.TRUSTED_ORIGINS?.split(',')
      .map((o) => o.trim())
      .filter(Boolean) || [
      'http://localhost:3000',
      'https://quantum-investment-trading.vercel.app',
    ];
  }
  app.enableCors({
    origin: corsOrigins,
    credentials: true, // Allow cookies to be sent
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
  });

  // Render and other cloud platforms require binding to 0.0.0.0
  const port = parseInt(process.env.PORT ?? '3004', 10);
  const host = process.env.HOST ?? '0.0.0.0';

  // Log memory usage before listening
  const memBefore = process.memoryUsage();
  logger.log(
    `Memory before listen: ${Math.round(memBefore.heapUsed / 1024 / 1024)}MB / ${Math.round(memBefore.heapTotal / 1024 / 1024)}MB`,
  );

  await app.startAllMicroservices();
  await app.listen(port, host);

  // Log memory usage after startup
  const memAfter = process.memoryUsage();
  logger.log(
    `Memory after listen: ${Math.round(memAfter.heapUsed / 1024 / 1024)}MB / ${Math.round(memAfter.heapTotal / 1024 / 1024)}MB`,
  );

  logger.log(`Application is running on: http://${host}:${port}`);
  logger.log(`gRPC microservice is running on port ${grpcPort}`);
  logger.log(`Health check: http://${host}:${port}/health`);
}

void bootstrap().catch((error) => {
  console.error('Error during application bootstrap:', error);
  writeFileSync('graph.json', PartialGraphHost.toString() ?? '');
  process.exit(1);
});
