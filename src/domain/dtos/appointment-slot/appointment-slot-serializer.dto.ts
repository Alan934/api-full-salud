import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type, Transform } from 'class-transformer';
import { FullBaseDto, ShortBaseDto } from '../../../common/dtos';
import { Day } from '../../enums';
import { SerializerVeryShortLocationDto } from '../location/location-serializer-veryShort.dto';
import { SecondOptimizePractitionerDto } from '../practitioner/practitioner-optimize-serializer';
import { SerializerAppointmentSlotScheduleDto } from '../appointment_slot_schedule/appointment_slot_schedule.dto';

export class SerializerAppointmentSlotDto extends FullBaseDto {

  @Expose()
  @Type(() => SerializerAppointmentSlotScheduleDto)
  @ApiProperty({
    type: [SerializerAppointmentSlotScheduleDto],
    description: 'Schedules with opening and closing hours'
  })
  schedules?: SerializerAppointmentSlotScheduleDto[];

  @Expose()
  @ApiProperty({
    example: Object.values(Day).join(', ')
  })
  day: Day;

  @Expose()
  @Type(() => SecondOptimizePractitionerDto)
  practitioner?: SecondOptimizePractitionerDto;

  @Expose()
  @ApiProperty({ example: 'f1a58556-4111-47e2-acdf-223328fd5d82', nullable: true })
  locationId?: string | null;

  @Expose()
  @ApiProperty({ example: false, description: 'true si el slot está no disponible' })
  unavailable: boolean;

  @Expose()
  @ApiProperty({ 
    example: 30, 
    description: 'Duración de cada cita en minutos',
    type: Number 
  })
  durationAppointment: number;
}

export class SerializerShortAppointmentSlotDto extends ShortBaseDto {
  @Expose()
  @Type(() => SerializerAppointmentSlotScheduleDto)
  @ApiProperty({
    type: [SerializerAppointmentSlotScheduleDto],
    description: 'Schedules with opening and closing hours'
  })
  schedules?: SerializerAppointmentSlotScheduleDto[];

  @Expose()
  @ApiProperty({
    example: Object.values(Day).join(', ')
  })
  day: Day;

  @Expose()
  @ApiProperty({ example: false, description: 'true si el slot está no disponible' })
  unavailable: boolean;

  @Expose()
  @ApiProperty({ 
    example: 30, 
    description: 'Duración de cada cita en minutos',
    type: Number 
  })
  durationAppointment: number;
}

export class OptimizeSerializerAppointmentSlotDto extends FullBaseDto {

  @Expose()
  @Type(() => SerializerAppointmentSlotScheduleDto)
  @ApiProperty({
    type: [SerializerAppointmentSlotScheduleDto],
    description: 'Schedules with opening and closing hours'
  })
  schedules?: SerializerAppointmentSlotScheduleDto[];

  @Expose()
  @ApiProperty({ example: 'Sunday' })
  day: Day;

  @Expose()
  @ApiProperty({ example: false, description: 'true si el slot está no disponible' })
  unavailable: boolean;

  @Expose()
  @Type(() => SerializerVeryShortLocationDto)
  location: SerializerVeryShortLocationDto;

  @Expose()
  @ApiProperty({ 
    example: 30, 
    description: 'Duración de cada cita en minutos',
    type: Number 
  })
  durationAppointment: number;

  @Expose()
  @Type(() => SecondOptimizePractitionerDto)
  practitioner: SecondOptimizePractitionerDto;

}
