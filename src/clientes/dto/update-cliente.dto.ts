import { PartialType } from '@nestjs/mapped-types';
import { CreateClienteDto } from './create-cliente.dto';

// PartialType toma CreateClienteDto y hace que TODOS sus campos sean
// opcionales, sin tener que repetir cada validación manualmente.
export class UpdateClienteDto extends PartialType(CreateClienteDto) {}