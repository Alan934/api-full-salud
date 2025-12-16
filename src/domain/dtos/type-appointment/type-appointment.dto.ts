import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { CreateTypeAppointmentAvailabilityDto } from '../type_appointment_availability/type-appointment-availability.dto';
import { Day } from '../../../domain/enums';

class AvailabilityDto extends PartialType(CreateTypeAppointmentAvailabilityDto) {
  id?: string;
  
  day: Day;

  startTime: string;

  endTime: string;
}

export class CreateTypeAppointmentDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'Consulta General' })
  name: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: '#FF0000' })
  color: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Instrucciones para la consulta general', required: false })
  instructions?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'a3e19e4d-9c73-4f94-bc1b-6c0bb24afc89', required: false })
  practitionerId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityDto)
  @ApiProperty({ type: [AvailabilityDto], required: false })
  availabilities?: AvailabilityDto[];
}

export class UpdateTypeAppointmentDto extends PartialType(CreateTypeAppointmentDto) {
  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Consulta General Actualizada', required: false })
  name?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: '#00FF00', required: false })
  color?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Instrucciones para la consulta general', required: false })
  instructions?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'a3e19e4d-9c73-4f94-bc1b-6c0bb24afc89', required: false })
  practitionerId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityDto)
  @ApiProperty({ type: [AvailabilityDto], required: false })
  availabilities?: AvailabilityDto[];
}