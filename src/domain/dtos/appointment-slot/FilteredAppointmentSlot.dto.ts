import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsInt, IsUUID, ValidateNested } from 'class-validator';
import { Day } from '../../enums';
import { Transform, Type } from 'class-transformer';
import { FilterScheduleDto } from '../appointment_slot_schedule/appointment_slot_schedule.dto';

export class FilteredAppointmentSlotDto {
  @ApiPropertyOptional({
    description: 'Día disponible',
    enum: Day,
    enumName: 'Day',
    example: Day.MONDAY,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    // Normaliza valores como 'MONDAY' o 'monday' a 'Monday'. Ignora valores vacíos o '--'
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed || trimmed === '--') return undefined;
    const lower = trimmed.toLowerCase();
    const candidates: Record<string, Day> = {
      sunday: Day.SUNDAY,
      monday: Day.MONDAY,
      tuesday: Day.TUESDAY,
      wednesday: Day.WEDNESDAY,
      thursday: Day.THURSDAY,
      friday: Day.FRIDAY,
      saturday: Day.SATURDAY,
    };
    return candidates[lower] ?? trimmed;
  })
  @IsEnum(Day)
  day?: Day;

  @IsOptional()
  @ApiProperty({ required: false, type: Boolean })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  allDays?: boolean | string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FilterScheduleDto)
  schedules?: FilterScheduleDto[];

  @ApiProperty({ example: 1, description: 'Número de página' })
  @IsInt()
  page: number;

  @ApiProperty({ example: 10, description: 'Límite de resultados por página' })
  @IsInt()
  limit: number;

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
    description: 'ID of the location where the appointment takes place'
  })
  locationId?: string;
}
