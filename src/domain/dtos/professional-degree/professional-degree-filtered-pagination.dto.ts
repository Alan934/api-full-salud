import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber } from 'class-validator';

export class ProfessionalDegreeFilteredPaginationDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsNumber()
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter by professional degree name (partial match)' })
  @IsOptional()
  @IsString()
  professionalDegree?: string;
}