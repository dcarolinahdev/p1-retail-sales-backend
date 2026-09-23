import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global() hace que PrismaService esté disponible en cualquier módulo
// de la app sin tener que importar PrismaModule en cada uno.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}