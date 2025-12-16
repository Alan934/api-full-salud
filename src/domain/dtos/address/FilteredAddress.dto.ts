import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class FilteredAddressDto {
  @ApiPropertyOptional({ example: 'San Martín', description: 'Nombre de la calle' })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiPropertyOptional({ example: '3', description: 'Número de piso' })
  @IsOptional()
  @IsString()
  floor?: string;

  @ApiPropertyOptional({ example: '5507', description: 'Código postal (zipCode)' })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiPropertyOptional({ example: '1', description: 'ID de la localidad' })
  @IsOptional()
  @IsString()
  localityId?: string;

  @ApiProperty({ example: 1, description: 'Número de página' })
  @IsInt()
  page: number;

  @ApiProperty({ example: 10, description: 'Límite de resultados por página' })
  @IsInt()
  limit: number;
}