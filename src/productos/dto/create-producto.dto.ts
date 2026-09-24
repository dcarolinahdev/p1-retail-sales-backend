import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateProductoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsNumber()
  @Min(0)
  precioActual: number;

  @IsString()
  @IsNotEmpty()
  categoriaId: string;
}
