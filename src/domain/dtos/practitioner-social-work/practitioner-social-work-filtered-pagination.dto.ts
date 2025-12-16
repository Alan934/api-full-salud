import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsNumber, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dtos';

export class PractitionerSocialWorkFilteredPaginationDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by Practitioner ID' })
  @IsOptional()
  @IsUUID()
  practitionerId?: string;

  @ApiPropertyOptional({ description: 'Filter by Social Work ID' })
  @IsOptional()
  @IsUUID()
  socialWorkId?: string;

  @ApiPropertyOptional({ description: 'Filter by minimum price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Filter by maximum price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;
}