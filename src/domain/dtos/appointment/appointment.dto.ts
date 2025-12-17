import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  ValidateNested
} from 'class-validator';
import { Express } from 'express';
import 'multer';
import { Type } from 'class-transformer';
import { ShortBaseDto } from '../../../common/dtos';
import { ApiHideProperty, ApiProperty, PartialType } from '@nestjs/swagger';
import { AppointmentStatus } from '../../enums';
import { IsTime } from '../../../common/util/custom-dto-properties-decorators/validate-hour-decorator.util';
import { IncompatableWith } from '../../../common/util/custom-dto-properties-decorators/validate-incompatible-properties.util';
import { CreateTypeAppointmentDto, CreateAppointmentSlotDto, CreatePatientDto } from '../../dtos';

export class CreateAppointmentDto{

  @IsOptional()
  @IsUUID()
  @ApiProperty({ 
    example: 'f479d8de-d255-4350-99fc-340a48cde4dd',
    required: false,
    description: 'ID del slot. Si no se proporciona, se auto-resuelve basándose en practitioner, fecha y hora.'
  })
  slotId?: string;

  @IsOptional()
  @IsUUID()
  @ApiProperty({ 
    example: '24836f5a-86ad-4898-a056-f759fc6d7cee',
    required: false,
    description: 'ID del schedule. Si no se proporciona, se auto-resuelve basándose en practitioner, fecha y hora.'
  })
  scheduleId?: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  date?: string;

  @IsOptional()
  hour?: string;

  @IsNotEmpty() @IsUUID()
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  practitionerId: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'dolor de pecho opresivo que se irradia hacia el brazo izquierdo, dificultad para respirar y sudoración excesiva'
  })
  observation?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: '20a05b0e-d872-4fe5-bf9f-4b6b010b443d' })
  patientId?: string;

  // Evitamos que Swagger expanda el árbol recursivo de CreatePatientDto
  @IsOptional()
  @ValidateNested()
  @Type(() => CreatePatientDto)
  @ApiHideProperty()
  patient?: CreatePatientDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @ApiProperty({
    example: 120,
    description: 'Custom duration in minutes. If not provided, practitioner\'s default duration will be used.'
  })
  customDuration?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ShortBaseDto)
  diagnostic?: ShortBaseDto;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  @ApiProperty({
    examples: [
      AppointmentStatus.APPROVED,
      AppointmentStatus.CANCELLED,
      AppointmentStatus.COMPLETED,
      AppointmentStatus.NO_SHOW,
      AppointmentStatus.PENDING,
      AppointmentStatus.UNDER_REVIEW
    ]
  })
  status?: AppointmentStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateTypeAppointmentDto)
  @ApiHideProperty()
  typeAppointment?: CreateTypeAppointmentDto;
}

export class UpdateAppointmentDto extends PartialType(CreateAppointmentDto) {
  @IsOptional()
  @IsEnum(AppointmentStatus)
  @ApiProperty({
    examples: [
      AppointmentStatus.APPROVED,
      AppointmentStatus.CANCELLED,
      AppointmentStatus.COMPLETED,
      AppointmentStatus.NO_SHOW,
      AppointmentStatus.PENDING,
      AppointmentStatus.UNDER_REVIEW
    ]
  })
  status?: AppointmentStatus;

  @IsString()
  @IsOptional()
  @ApiProperty({ example: '20a05b0e-d872-4fe5-bf9f-4b6b010b443d' })
  userId?: string;
}

export class CreateTurnDtoWithFiles {
  @ValidateNested()
  @Type(() => CreateAppointmentDto)
  @ApiProperty({ type: CreateAppointmentDto })
  turn?: CreateAppointmentDto;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
    description: 'Imagénes de derivaciones en formato PNG, JPG o JPEG'
  })
  derivationImages?: Express.Multer.File[];
}

export class TimeDTO {
  appointment_hour: string
  consultation_time: string
}

// New DTO used to reprogram an existing appointment (change date/hour keeping the same practitioner)
export class ReprogramAppointmentDto {
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/,{ message: 'La fecha debe estar en formato YYYY-MM-DD' })
  @ApiProperty({ example: '2025-08-21', description: 'Nueva fecha de la cita (YYYY-MM-DD)' })
  date: string;

  @IsNotEmpty()
  @Matches(/^\d{2}:\d{2}$/,{ message: 'La hora debe estar en formato HH:MM' })
  @ApiProperty({ example: '14:30', description: 'Nueva hora de la cita (HH:MM, 24h)' })
  hour: string;

  @IsNotEmpty()
  @IsUUID()
  @ApiProperty({ example: 'f479d8de-d255-4350-99fc-340a48cde4dd', description: 'Slot del mismo practitioner' })
  slotId: string;

  @IsNotEmpty()
  @IsUUID()
  @ApiProperty({ example: '24836f6a-86ad-4898-a056-f759fc6d7cee', description: 'Schedule perteneciente al slot' })
  scheduleId: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Reprogramado por inconveniente del paciente', required: false })
  observation?: string;
}