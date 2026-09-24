import { Module } from '@nestjs/common';

import { CategoriasService } from './categorias.service';
import { CategoriasController } from './categorias.controller';
import { ProductosService } from './productos.service';
import { ProductosController } from './productos.controller';

import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Module({
  controllers: [
    CategoriasController,
    ProductosController
  ],
  providers: [
    CategoriasService,
    ProductosService,
    PermissionsGuard
  ],
})
export class ProductosModule {}
