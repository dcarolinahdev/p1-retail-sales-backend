import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

// Define y valida la forma de los datos que llegan al endpoint de login.
// class-validator revisa esto automáticamente antes de que el request
// llegue al controller (si el ValidationPipe global está activo).
export class LoginDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;
}