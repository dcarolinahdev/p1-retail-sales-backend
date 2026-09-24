import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TipoMovimiento, PrismaClient } from '../../generated/prisma/client';

/*
 * Omit<A, B> es una utilidad de TypeScript: toma el tipo A y le quita las
 * propiedades listadas en B. Aquí: toma el PrismaClient completo y le
 * quita los métodos que NO existen en el objeto "tx" que Prisma entrega
 * dentro de $transaction(async (tx) => {...}) — como abrir otra conexión
 * ($connect/$disconnect) o anidar otra transacción ($transaction).
 *
 * Se reconstruye manualmente con Omit, en vez de importar el tipo que
 * Prisma ya define internamente (Prisma.TransactionClient), porque con
 * el generador "prisma-client" + moduleFormat "cjs" que usa este proyecto,
 * ese tipo no queda expuesto para importación directa como sí ocurre con
 * el generador clásico "prisma-client-js".
 *
 * Este tipo es solo para que TypeScript valide tx.inventario.create(...);
 * no afecta el comportamiento en tiempo de ejecución.
 */
type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class InventarioService {
  constructor(private readonly prisma: PrismaService) {}

  // Suma ENTRADA menos suma SALIDA para un producto. Recibe un cliente de
  // Prisma opcional (tx) para poder ejecutarse dentro de una transacción
  // externa (ej. la de VentasService) en vez de siempre usar this.prisma
  // directo, que abriría su propia conexión fuera de esa transacción.
  async calcularStock(
    productoId: string,
    tx: PrismaTransactionClient | PrismaService = this.prisma,
  ): Promise<number> {
    const movimientos = await tx.inventario.groupBy({
      by: ['tipo'],
      where: { productoId },
      _sum: { cantidad: true },
    });

    const entradas = movimientos.find((m) => m.tipo === 'ENTRADA')?._sum.cantidad ?? 0;
    const salidas = movimientos.find((m) => m.tipo === 'SALIDA')?._sum.cantidad ?? 0;

    return entradas - salidas;
  }

  // Punto único de escritura para cualquier movimiento de inventario.
  // Valida stock suficiente SOLO si es una SALIDA — una ENTRADA nunca
  // necesita esa validación (siempre suma). Mismo motivo por el que
  // recibe `tx`: para participar en la transacción de VentasService.
  async registrarMovimiento(
    productoId: string,
    tipo: TipoMovimiento,
    cantidad: number,
    tx: PrismaTransactionClient | PrismaService = this.prisma,
  ) {
    if (tipo === 'SALIDA') {
      const stockActual = await this.calcularStock(productoId, tx);
      if (stockActual < cantidad) {
        throw new ConflictException(
          `Stock insuficiente para el producto ${productoId}. Disponible: ${stockActual}, solicitado: ${cantidad}`,
        );
      }
    }

    return tx.inventario.create({
      data: { productoId, tipo, cantidad },
    });
  }
}
