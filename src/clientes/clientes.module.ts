import { Module } from '@nestjs/common';

import { ClientesService } from './clientes.service';
import { ClientesController } from './clientes.controller';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Module({
  controllers: [ClientesController],
  providers: [
    ClientesService,
    PermissionsGuard
  ],
})
export class ClientesModule {}
