import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';

@Injectable()
export class CategoriasService {
  constructor(private readonly prisma: PrismaService) {}

  // P2002 (nombre duplicado) lo captura el PrismaExceptionFilter global.
  create(createCategoriaDto: CreateCategoriaDto) {
    return this.prisma.categoria.create({
      data: createCategoriaDto,
    });
  }

  // Listado liviano: mismo patrón que ClientesService.findAll() — trae
  // activas e inactivas, solo los campos esenciales para una vista de tabla.
  findAll() {
    return this.prisma.categoria.findMany({
      select: {
        id: true,
        nombre: true,
        activo: true,
      },
    });
  }

  async findOne(id: string) {
    const categoria = await this.prisma.categoria.findUnique({ where: { id } });
    if (!categoria) {
      throw new NotFoundException('Categoría no encontrada');
    }
    return categoria;
  }

  // P2025 (id no existe) lo captura el PrismaExceptionFilter global.
  update(id: string, updateCategoriaDto: UpdateCategoriaDto) {
    return this.prisma.categoria.update({
      where: { id },
      data: updateCategoriaDto,
    });
  }

  // Soft delete, mismo patrón que Cliente.
  remove(id: string) {
    return this.prisma.categoria.update({
      where: { id },
      data: { activo: false },
    });
  }
}
