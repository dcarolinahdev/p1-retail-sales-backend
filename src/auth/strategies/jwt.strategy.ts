import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

// Define cómo se extrae y valida el JWT en cada request:
// de dónde lo saca (header Authorization: Bearer <token>) y con qué
// secreto verifica su firma.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // rechaza tokens vencidos automáticamente
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  // Passport ya verificó la firma y expiración del token antes de llegar aquí.
  // Lo que retornamos acá se convierte en `request.user` en cualquier
  // controller/guard que use este Guard.
  validate(payload: { sub: string; email: string; rol: string }) {
    return { userId: payload.sub, email: payload.email, rol: payload.rol };
  }
}
