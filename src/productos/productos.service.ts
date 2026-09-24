import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { InventarioService } from '../inventario/inventario.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';

@Injectable()
export class ProductosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventarioService: InventarioService, // nueva dependencia
  ) {}

  // Si categoriaId no existe, Prisma lanza P2003 (violación de llave foránea)
  // — no está mapeado explícitamente en el PrismaExceptionFilter todavía,
  // cae en el caso "default" (500 controlado). Lo dejamos así por ahora:
  // no es el foco de este módulo, se puede afinar después si hace falta.
  create(createProductoDto: CreateProductoDto) {
    return this.prisma.producto.create({
      data: createProductoDto,
    });
  }

  /* Listado liviano, mismo patrón que Cliente/Categoria — incluye el
   * nombre de la categoría relacionada (join) porque es información
   * esencial para identificar el producto en una tabla.
   * 
   * findAll ahora calcula el stock de CADA producto del listado.
   * Como calcularStock es una consulta por producto, esto implica una
   * consulta extra por cada uno (N+1) — aceptable para el volumen de datos
   * de un proyecto de portafolio; en un sistema de alto volumen esto se
   * optimizaría con una sola consulta agregada para todos los productos
  */
  async findAll() {
    const productos = await this.prisma.producto.findMany({
      select: {
        id: true,
        nombre: true,
        precioActual: true,
        activo: true,
        categoria: { select: { nombre: true } },
      },
    });

    /* Ahora hay que ir producto por producto y calcularle el stock a cada
     * uno, antes de que la respuesta salga del método.
     * 
     * productos.map(async (p) => {...}) NO devuelve un array de objetos
     * listos: como cada función dentro del map es "async", devuelve un
     * array de PROMESAS (una por producto, cada una "pendiente" hasta que
     * termine su propio cálculo de stock). Promise.all(...) es lo que
     * espera a que TODAS esas promesas se resuelvan, y recién ahí entrega
     * el array final con los valores reales ya calculados.
     */
    return Promise.all(
      productos.map(async (producto) => ({
        ...producto,
        /* calcularStock() consulta la base de datos (es asíncrono) — await
         * espera ese resultado real antes de poder armar el objeto final;
         * sin el await, "stock" quedaría como una Promise pendiente en vez
         * del número calculado.
         */
        stock: await this.inventarioService.calcularStock(producto.id),
      })),
    );
  }

  async findOne(id: string) {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: {
        /* select anidado: trae la categoría relacionada, pero solo estos
         * campos — evita arrastrar toda la fila de Categoria (incluyendo
         * campos que no aportan al detalle de un producto, como activo
         * o creadoEn de la categoría en sí).
        */
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

    /* calcularStock es asíncrono (consulta la BD), así que se espera su resultado
     * real antes de armar la respuesta.
     */
    const stock = await this.inventarioService.calcularStock(id);

    /* Spread operator (...producto): copia todas las propiedades del objeto
     * "producto" (id, nombre, descripcion, precioActual, categoria, etc.)
     * dentro de un objeto nuevo, y le agrega la propiedad "stock" al lado.
     * Es la forma de "combinar" el producto ya existente con el dato nuevo
     * calculado, sin tener que copiar cada campo uno por uno a mano.
     */
    return { ...producto, stock };
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
