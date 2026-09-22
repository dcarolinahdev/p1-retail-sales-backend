import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './prisma/prisma.module';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
