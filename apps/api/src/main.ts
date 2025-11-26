import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    snapshot: true,
  });
  await app.listen(process.env.PORT ?? 3004);
}

void bootstrap();
