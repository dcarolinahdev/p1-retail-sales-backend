import { Module } from '@nestjs/common';

import { CategoriasService } from './categorias.service';
import { CategoriasController } from './categorias.controller';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Module({
  controllers: [
    CategoriasController
  ],
  providers: [
    CategoriasService,
    PermissionsGuard
  ],
})
export class ProductosModule {}
