import { Get, Post, Patch, Delete } from '@nestjs/common';
import { Controller, Body, Param, UseGuards } from '@nestjs/common';

import { CategoriasService } from './categorias.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

// A diferencia de Clientes, TODOS los endpoints de escritura de Categorías
// son exclusivos de admin — por eso aplicamos PermissionsGuard también a
// nivel de controller (no solo en un método individual como hicimos con
// clientes:eliminar), ya que la restricción es uniforme para todo el CRUD.
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('categorias')
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  @RequirePermission('categorias:crear')
  @Post()
  create(@Body() createCategoriaDto: CreateCategoriaDto) {
    return this.categoriasService.create(createCategoriaDto);
  }

  // Sin @RequirePermission: solo exige estar autenticado (JwtAuthGuard),
  // cualquier rol puede listar/ver categorías, solo escribir es exclusivo de admin.
  @Get()
  findAll() {
    return this.categoriasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriasService.findOne(id);
  }

  @RequirePermission('categorias:editar')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCategoriaDto: UpdateCategoriaDto) {
    return this.categoriasService.update(id, updateCategoriaDto);
  }

  @RequirePermission('categorias:eliminar')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoriasService.remove(id);
  }
}
