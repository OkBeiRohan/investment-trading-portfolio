import { NestFactory, PartialGraphHost } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { writeFileSync } from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    snapshot:
      process.env.DEVTOOLS === 'true' && process.env.NODE_ENV !== 'production',
    abortOnError: process.env.DEVTOOLS !== 'true',
  });

  // Render and other cloud platforms require binding to 0.0.0.0
  const port = parseInt(process.env.PORT ?? '3004', 10);
  const host = process.env.HOST ?? '0.0.0.0';

  console.log(`Application will initialize in http://${host}:${port}`);

  await app.listen(port, host);

  console.log(`🚀 Application is running on: http://${host}:${port}`);
  console.log(`📊 Health check: http://${host}:${port}/health`);
}

void bootstrap().catch((error) => {
  console.error('Error during application bootstrap:', error);
  writeFileSync('graph.json', PartialGraphHost.toString() ?? '');
  process.exit(1);
});
