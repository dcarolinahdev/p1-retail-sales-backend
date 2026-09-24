import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Valida automáticamente todo DTO marcado con decoradores de class-validator
  // (ej. LoginDto) antes de que el request llegue al controller.
  app.useGlobalPipes(new ValidationPipe());

  // Captura errores de Prisma no manejados manualmente (ej. campo único
  // duplicado) y los traduce a respuestas HTTP consistentes en TODA la app.
  app.useGlobalFilters(new PrismaExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
