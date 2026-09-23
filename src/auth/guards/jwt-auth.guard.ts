import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Guard reutilizable: se aplica con @UseGuards(JwtAuthGuard) sobre
// cualquier endpoint que deba requerir un JWT válido para ejecutarse.
// Por debajo, dispara la JwtStrategy que ya registramos.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
