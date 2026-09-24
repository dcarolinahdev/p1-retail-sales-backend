import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Lee el permiso requerido que el decorador @RequirePermission dejó
    // como metadata en el endpoint. Si el endpoint no tiene el decorador,
    // no se exige ningún permiso específico (solo el JwtAuthGuard ya
    // validó que el usuario esté autenticado).
    const requiredPermission = this.reflector.get<string>(
      PERMISSION_KEY,
      context.getHandler(),
    );
    if (!requiredPermission) return true;

    // req.user viene de JwtStrategy.validate() — ya sabemos el rol del token.
    const { user } = context.switchToHttp().getRequest();

    // Verifica en la base de datos si el rol del usuario tiene asociado
    // el permiso requerido, vía la tabla intermedia RolPermiso.
    const tienePermiso = await this.prisma.rolPermiso.findFirst({
      where: {
        rol: { nombre: user.rol },
        permiso: { nombre: requiredPermission },
      },
    });

    if (!tienePermiso) {
      throw new ForbiddenException(
        `No tienes el permiso requerido: ${requiredPermission}`,
      );
    }
    return true;
  }
}
