import { NestFactory, PartialGraphHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { writeFileSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    snapshot: process.env.DEVTOOLS === 'true',
    abortOnError: process.env.DEVTOOLS !== 'true',
  });
  await app.listen(process.env.PORT ?? 3004);
}

void bootstrap().catch((error) => {
  writeFileSync('graph.json', PartialGraphHost.toString() ?? '');
  process.exit(1);
});
