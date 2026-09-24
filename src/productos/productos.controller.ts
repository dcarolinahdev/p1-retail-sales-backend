import { Get, Post, Patch, Delete, Controller, Body, Param, UseGuards } from '@nestjs/common';

import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

// Mismo patrón que Clientes: crear/editar los puede hacer admin y vendedor,
// eliminar es exclusivo de admin — por eso PermissionsGuard se aplica a
// nivel de controller, pero @RequirePermission difiere solo en remove().
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @RequirePermission('productos:crear')
  @Post()
  create(@Body() createProductoDto: CreateProductoDto) {
    return this.productosService.create(createProductoDto);
  }

  @Get()
  findAll() {
    return this.productosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productosService.findOne(id);
  }

  @RequirePermission('productos:editar')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductoDto: UpdateProductoDto) {
    return this.productosService.update(id, updateProductoDto);
  }

  @RequirePermission('productos:eliminar')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productosService.remove(id);
  }
}
