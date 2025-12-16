import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsDateString } from 'class-validator';
import { PaginationDto } from '../../../common/dtos';

export class PrescriptionFilteredPaginationDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  @ApiProperty({
    required: false,
    description: 'Filter by Patient ID',
    example: 'uuid-de-paciente',
  })
  patientId?: string;

  @IsOptional()
  @IsUUID()
  @ApiProperty({
    required: false,
    description: 'Filter by Practitioner ID',
    example: 'uuid-de-profesional',
  })
  practitionerId?: string;

  @IsOptional()
  @IsDateString()
  @ApiProperty({
    required: false,
    description: 'Filter by date (yyyy-mm-dd)',
    example: '2024-12-25',
  })
  date?: string;
}
