import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { PaginationDto, ShortBaseDto } from '../../../common/dtos';

export class CreateDepartmentDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'Maipú' })
  name: string;

  @IsNotEmpty()
  @IsString() // Cambiado a IsString
  @ApiProperty({ example: 'uuid-de-la-provincia' })
  provinceId: string; // Cambiado el nombre y el tipo
  }

export class UpdateDepartmentDto {
  @IsString()
  @IsOptional()
  @ApiProperty({ example: 'Maipú' })
  name?: string;

  @IsOptional()
  @IsString() // Cambiado a IsString
  @ApiProperty({ example: 'uuid-de-la-provincia' })
  provinceId?: string; // Cambiado el nombre y el tipo
}


export class FilteredDepartmentDto extends PaginationDto{
  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Maipú' })
  name?: string;
}

