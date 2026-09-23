import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '../../../generated/prisma/client';

/* Captura errores "crudos" que Prisma lanza directo desde la base de datos
 * (sin que nosotras hayamos escrito un throw manual) y los traduce a
 * respuestas HTTP consistentes, con el mismo formato que usan las
 * excepciones nativas de NestJS (UnauthorizedException, etc.).
*/
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    switch (exception.code) {
      case 'P2002': {
        // Violación de restricción única (ej. documentoIdentidad o email duplicado)
        const campo = (exception.meta?.target as string[])?.join(', ') ?? 'campo';
        response.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          message: `Ya existe un registro con ese valor en: ${campo}`,
          error: 'Conflict',
        });
        break;
      }
      case 'P2025': {
        // Registro no encontrado (ej. actualizar/eliminar un ID que no existe)
        response.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Registro no encontrado',
          error: 'Not Found',
        });
        break;
      }
      default: {
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error interno del servidor',
          error: 'Internal Server Error',
        });
      }
    }
  }
}
