import { SetMetadata } from '@nestjs/common';

// Permite marcar un endpoint con el permiso exacto que requiere, ej:
// @RequirePermission('clientes:eliminar')
// El PermissionsGuard lee este metadato para saber qué validar.
export const PERMISSION_KEY = 'permission';
export const RequirePermission = (permission: string) =>
  SetMetadata(PERMISSION_KEY, permission);
