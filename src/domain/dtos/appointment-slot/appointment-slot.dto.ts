import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { Day } from '../../enums';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsTime } from '../../../common/util/custom-dto-properties-decorators/validate-hour-decorator.util';
import { ShortBaseDto } from '../../../common/dtos';
import { CreateAppointmentSlotScheduleDto, UpdateAppointmentSlotScheduleDto } from '../appointment_slot_schedule/appointment_slot_schedule.dto';

export class CreateAppointmentSlotDto {

  @ApiProperty({
    description: 'Duration of the appointment in minutes',
    example: 30,
    required: false,
    default: 30
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  durationAppointment?: number;

  @IsNotEmpty()
  @IsEnum(Day)
  @ApiProperty({
    examples: [
      Day.SUNDAY,
      Day.MONDAY,
      Day.TUESDAY,
      Day.WEDNESDAY,
      Day.THURSDAY,
      Day.FRIDAY,
      Day.SATURDAY
    ]
  })
  day: Day;

  @IsOptional()
  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'ID of the practitioner this appointment belongs to'
  })
  practitionerId?: string;

  @IsOptional()
  @IsUUID()
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'ID of the branch'
  })
  branchId?: string;

  @IsOptional()
  @IsUUID()
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'ID of the location where the appointment takes place'
  })
  locationId?: string;

  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateAppointmentSlotScheduleDto)
  @ApiProperty({ type: [CreateAppointmentSlotScheduleDto] })
  schedules: CreateAppointmentSlotScheduleDto[];
}

export class UpdateAppointmentSlotDto extends PartialType(
  OmitType(CreateAppointmentSlotDto, ['schedules'] as const)
) {
  @IsOptional()
  @IsNotEmpty()
  @IsUUID()
  id?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateAppointmentSlotScheduleDto)
  @ApiProperty({ type: [UpdateAppointmentSlotScheduleDto], required: false })
  schedules?: UpdateAppointmentSlotScheduleDto[];
}

