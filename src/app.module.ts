import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ClientesModule } from './clientes/clientes.module';
import { ProductosModule } from './productos/productos.module';
import { InventarioModule } from './inventario/inventario.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      /* hace que ConfigModule cargue el .env una sola vez al iniciar y
       * esas variables queden disponibles para toda la aplicación 
       * (incluyendo PrismaService, que las necesita para conectarse).
      */
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    ClientesModule,
    ProductosModule,
    InventarioModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
