import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";


export class FilteredCountryDto {
    @ApiPropertyOptional({ example: 'Argentina', description: 'Nombre del país' })
    @IsOptional()
    @IsString()
    name?: string;
  
    @ApiPropertyOptional({ example: 1, description: 'Número de página' })
    @IsOptional()
    page?: number;
  
    @ApiPropertyOptional({ example: 10, description: 'Límite de resultados por página' })
    @IsOptional()
    limit?: number;
  }