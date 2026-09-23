import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '10h' }, // coincide con la decisión ya cerrada
    }),
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService], // para que otros módulos puedan usar AuthService si lo necesitan (ej. un Guard)
})
export class AuthModule {}