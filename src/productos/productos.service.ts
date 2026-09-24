import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';

@Injectable()
export class ProductosService {
  constructor(private readonly prisma: PrismaService) {}

  // Si categoriaId no existe, Prisma lanza P2003 (violación de llave foránea)
  // — no está mapeado explícitamente en el PrismaExceptionFilter todavía,
  // cae en el caso "default" (500 controlado). Lo dejamos así por ahora:
  // no es el foco de este módulo, se puede afinar después si hace falta.
  create(createProductoDto: CreateProductoDto) {
    return this.prisma.producto.create({
      data: createProductoDto,
    });
  }

  // Listado liviano, mismo patrón que Cliente/Categoria — incluye el
  // nombre de la categoría relacionada (join) porque es información
  // esencial para identificar el producto en una tabla.
  findAll() {
    return this.prisma.producto.findMany({
      select: {
        id: true,
        nombre: true,
        precioActual: true,
        activo: true,
        categoria: {
          select: { nombre: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: {
        // select anidado: trae la categoría relacionada, pero solo estos
        // campos — evita arrastrar toda la fila de Categoria (incluyendo
        // campos que no aportan al detalle de un producto, como activo
        // o creadoEn de la categoría en sí).
        categoria: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });
    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }
    return producto;
  }

  update(id: string, updateProductoDto: UpdateProductoDto) {
    return this.prisma.producto.update({
      where: { id },
      data: updateProductoDto,
    });
  }

  remove(id: string) {
    return this.prisma.producto.update({
      where: { id },
      data: { activo: false },
    });
  }
}
