import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { FullBaseDto } from '../../../common/dtos';
import { IsOptional } from 'class-validator';
import { SerializerTypeAppointmentAvailabilityDto } from '../type_appointment_availability/type-appointment-availability-serializer.dto';

export class SerializerTypeAppointmentDto extends FullBaseDto {
  @Expose()
  @ApiProperty({ example: 'Consulta General' })
  name: string;

  @Expose()
  @ApiProperty({ example: '#FF0000' })
  color: string;

  @Expose()
  @IsOptional()
  @ApiProperty({ example: 'Instrucciones para la consulta general', nullable: true })
  instructions?: string;

  @Expose()
  @IsOptional()
  @ApiProperty({ example: 'a3e19e4d-9c73-4f94-bc1b-6c0bb24afc89', nullable: true })
  practitionerId?: string;

  @Expose()
  @IsOptional()
  @Type(() => SerializerTypeAppointmentAvailabilityDto)
  @ApiProperty({
    type: () => [SerializerTypeAppointmentAvailabilityDto],
    description: 'Disponibilidades de este tipo de turno',
    required: false,
  })
  availabilities?: SerializerTypeAppointmentAvailabilityDto[];
}