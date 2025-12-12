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
  await app.listen(process.env.PORT ?? 3004);
}

void bootstrap().catch((error) => {
  writeFileSync('graph.json', PartialGraphHost.toString() ?? '');
  process.exit(1);
});
