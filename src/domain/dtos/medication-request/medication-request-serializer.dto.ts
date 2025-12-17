import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { ShortBaseDto } from '../../../common/dtos';
import { Expose, Type } from 'class-transformer';
import { SerializerUserDto } from '../user/user-serializer.dto';
import { SerializerShortPatientDto } from '../patient/patient-serializer.dto';
import { SerializerPractitionerDto } from '../practitioner/practitioner-serializer.dto';
import { SerializerAppointmentDto } from '../appointment/appointment-serializer.dto';

export class SerializerMedicationRequestDto extends ShortBaseDto {

  @Expose()
  @Type(() => SerializerPractitionerDto)
  @ApiProperty({ type: [SerializerPractitionerDto] })
  practitioner: SerializerPractitionerDto;

  @Expose()
  @Type(() => SerializerShortPatientDto)
  @ApiHideProperty()
  patient: SerializerShortPatientDto;

  @Expose()
  @ApiProperty({ example: 'Paracetamol' })
  medication: string;

  @Expose()
  @ApiProperty({ example: 'Tabletas recubiertas' })
  presentation?: string;

  @Expose()
  @ApiProperty({ example: '500 mg cada 8 horas' })
  dosis?: string;

  @Expose()
  @ApiProperty({ example: '7 días' })
  duaration?: string;

  @Expose()
  @ApiProperty({ example: 'Faringitis aguda' })
  observation?: string;

}
