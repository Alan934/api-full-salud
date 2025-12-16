import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumberString } from 'class-validator';
import { PaginationDto } from '../../../common/dtos/pagination-common.dto';

export class OrganizationTypeFilteredPaginationDto extends PaginationDto{
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Filter by organization type name', example: 'Diagnostico' })
  type?: string;
}
