import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { FullBaseDto } from '../../../common/dtos';
import {
  OptimizeSerializerAppointmentSlotDto,
  SerializerLocationDto,
  SerializerAppointmentSlotDto,
  SerializerSocialWorkEnrollmentDto,
  SerializerShortPatientDto,
} from '..';
import { Expose, Type } from 'class-transformer';
import { Role, AppointmentStatus } from '../../enums';
import { Practitioner } from '../../entities';
import { SecondOptimizePractitionerDto } from '../practitioner/practitioner-optimize-serializer';
import { SerializerVeryShortLocationDto } from '../location/location-serializer-veryShort.dto';

export class OptimizeAppointmentDto extends FullBaseDto {
  @Expose()
  @ApiProperty({ example: '14:29:17' })
  date: string;

  @Expose()
  @ApiProperty({ example: '14:29:17' })
  hour: string;

  @Expose()
  @ApiProperty({
    example: Object.values(AppointmentStatus).join(', ')
  })
  status: AppointmentStatus;

  @Expose()
  @Type(() => SerializerShortPatientDto)
  patient?: SerializerShortPatientDto;

}

export class SecondOptimizeAppointmentDto {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  date: string;

  @Expose()
  @ApiProperty()
  hour: string;

  @Expose()
  @Type(() => SecondOptimizePractitionerDto)
  @ApiProperty({ type: SecondOptimizePractitionerDto, required: false })
  practitioner?: SecondOptimizePractitionerDto;

  @Expose()
  @Type(() => SerializerShortPatientDto)
  @ApiHideProperty()
  patient: SerializerShortPatientDto;
}
