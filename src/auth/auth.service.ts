import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Busca el usuario por email, incluyendo su rol (necesario para el payload del token)
    // include: { rol: true } → trae el Rol relacionado en la misma consulta
    // (equivalente a un JOIN), evitando una segunda query aparte para el rol.
    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
      include: { rol: true },
    });

    // Mismo mensaje de error tanto si el usuario no existe como si la
    // contraseña es incorrecta — evita revelar cuál de las dos falló
    // (una pista útil para un atacante intentando adivinar emails válidos).
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Payload del JWT: solo lo necesario para identificar al usuario y su rol.
    // Nunca incluir el password, ni siquiera el hash.
    const payload = {
      sub: usuario.id, // "sub" (subject) es el estándar JWT para el ID del usuario
      email: usuario.email,
      rol: usuario.rol.nombre,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
