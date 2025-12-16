import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID, IsEnum } from 'class-validator';
import { PaginationDto } from '../../../common/dtos';
import { Day } from '../../enums';

export class TypeAppointmentFilterDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by name (partial match)' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Filter by exact color match' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({
    description: 'Filter by one or more practitioner IDs',
    example: ['a3e19e4d-9c73-4f94-bc1b-6c0bb24afc89', 'b5d28e4a-7c33-4f94-ac1b-9c1aa24afc12'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  practitionerIds?: string[];

  @IsOptional()
  @IsEnum(Day)
  @ApiPropertyOptional({
    example: Day.MONDAY,
    description: 'Filtra los tipos de cita que tengan disponibilidad en este día',
  })
  day?: Day;
}