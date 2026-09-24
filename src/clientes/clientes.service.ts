import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  // Crear no necesita manejo especial de errores aquí: si el documentoIdentidad
  // o email ya existen, Prisma lanza P2002, y el PrismaExceptionFilter global
  // lo traduce automáticamente a un 409 Conflict.
  create(createClienteDto: CreateClienteDto) {
    return this.prisma.cliente.create({
      data: createClienteDto,
    });
  }

  // Listado liviano: trae todos los clientes (activos e inactivos, para que
  // el admin/vendedor pueda ver y reactivar los desactivados si hace falta),
  // pero solo los campos esenciales para una vista de tabla — el detalle
  // completo se consulta por separado en findOne().
  findAll() {
    return this.prisma.cliente.findMany({
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        documentoIdentidad: true,
        activo: true,
      },
    });
  }

  async findOne(id: string) {
    const cliente = await this.prisma.cliente.findUnique({ where: { id } });

    // Este throw manual es intencional: findUnique no lanza error si no
    // encuentra nada, solo retorna null. Por eso NO lo captura el
    // PrismaExceptionFilter (P2025 es de update/delete, no de findUnique) —
    // necesitamos este chequeo explícito para devolver un 404 real.
    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }
    return cliente;
  }

  update(id: string, updateClienteDto: UpdateClienteDto) {
    // Si el id no existe, Prisma lanza P2025 -> el filter global lo traduce a 404.
    return this.prisma.cliente.update({
      where: { id },
      data: updateClienteDto,
    });
  }

  // Soft delete: no borra la fila, solo marca activo: false.
  // Mismo comportamiento ante P2025 que update().
  remove(id: string) {
    return this.prisma.cliente.update({
      where: { id },
      data: { activo: false },
    });
  }
}
