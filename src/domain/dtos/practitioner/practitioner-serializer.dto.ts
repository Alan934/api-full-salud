import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { SerializerProfessionalDegreeDto, SerializerShortPractitionerRoleDto, SerializerLocationDto, SerializerShortAppointmentSlotDto, SerializerAppointmentDto } from '..';
import { SerializerUserDto } from '../user/user-serializer.dto';
import { ShortBaseDto } from '../../../common/dtos';
import { modePractitioner } from '../../enums/mode-practitioner.enum';
import { PractitionerSocialWorkSerializerDto } from '../practitioner-social-work/practitioner-social-work-serializer.dto';

export class SerializerPractitionerDto extends SerializerUserDto {
  @Expose()
  @ApiProperty({ example: 'Practitioner' })
  resourceType?: string = 'Practitioner';

  @Expose()
  @ApiProperty({ example: '123456-M-BA' })
  license: string;

  @Expose()
  @Type(() => SerializerProfessionalDegreeDto)
  @ApiProperty({ type: [SerializerProfessionalDegreeDto] })
  professionalDegrees: SerializerProfessionalDegreeDto[];

  @Expose()
  @Type(() => SerializerShortAppointmentSlotDto)
  appointmentSlots: SerializerShortAppointmentSlotDto[];

  @Expose()
  @ApiProperty({ example: 'false' })
  homeService: boolean;

  @Expose()
  @ApiProperty({ example: 30 })
  durationAppointment?: number;

  @Expose()
  @ApiProperty({ example: 'false' })
  acceptedSocialWorks: boolean;

  @Expose()
  @Type(() => SerializerShortPractitionerRoleDto)
  practitionerRole: SerializerShortPractitionerRoleDto[];

  // @Expose()
  // @Type(() => SerializerShortAppointmentSlotDto)
  // practitionerAppointment: SerializerShortAppointmentSlotDto[];

  @Expose()
  @Type(() => SerializerAppointmentDto)
  turns: SerializerAppointmentDto[];

  @Expose()
  @Type(() => PractitionerSocialWorkSerializerDto)
  practitionerSocialWorks?: PractitionerSocialWorkSerializerDto[];

  @Expose()
  @ApiProperty({ enum: modePractitioner, example: modePractitioner.INPERSON })
  mode: modePractitioner;

}

export class ShortSerializerPractitionerDto extends SerializerUserDto {

}

export class SerializerShortPractitionerDto extends ShortBaseDto {
  @Expose()
  @Type(() => SerializerShortPractitionerRoleDto)
  practitionerRole: SerializerShortPractitionerRoleDto[];
}