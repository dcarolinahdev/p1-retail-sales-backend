import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    /**
     * se usa registerAsync porque el secret depende de ConfigService,
     * y este último necesita tiempo para cargar el .env al iniciar la app.
     * register() lee process.env directo y de forma síncrona, sin esperar
     * a que ConfigModule termine — eso causaba un error intermitente
     * ("secretOrPrivateKey must have a value"). registerAsync + useFactory
     * sí espera a que ConfigService esté listo antes de construir la config
     */
    JwtModule.registerAsync({
      imports: [ConfigModule], // asegura que ConfigModule esté listo antes de leer el secret
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '10h' },
      }),
    }),
  ],
  providers: [
    /** 
     * lógica de negocio: valida credenciales y genera el JWT en el login
     * Se invoca UNA VEZ, en el momento del login.
     */
    AuthService,
    /**
     * Passport la ejecuta en CADA request a una ruta protegida, para validar
     * que el token recibido sigue siendo válido (firma correcta, no vencido).
     */
    JwtStrategy
  ],
  controllers: [AuthController],
  exports: [AuthService], // para que otros módulos puedan usar AuthService si lo necesitan (ej. un Guard)
})
export class AuthModule {}