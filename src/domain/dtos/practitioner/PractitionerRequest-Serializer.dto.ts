import { Expose } from 'class-transformer';
import { ShortBaseDto } from '../../../common/dtos';
import { Gender } from '../../../domain/enums';
import { SerializerPractitionerRoleDto } from '../practitioner-role/practitioner-role-serializer.dto';
import { SerializerSocialWorkEnrollmentDto } from '../social-work-enrollment/social-work-enrollment-serializer.dto';
import { SerializerLocationDto } from '../location/Location-serializer.dto';
import { SerializerAppointmentDto } from '../appointment/Appointment-serializer.dto';

export class PractitionerRequestDto
   extends ShortBaseDto
{
  @Expose()
  license?: string;
  
  @Expose()
  homeService?: boolean;

  @Expose()
  name?: string;

  @Expose()
  lastName?: string;

  @Expose()
  dni?: string;

  @Expose()
  gender?: Gender;

  @Expose()
  birth?: string;

  @Expose()
  professionalDegree?: string;

  @Expose()
  practitionerRole?: SerializerPractitionerRoleDto;

  @Expose()
  socialWorkEnrollmentId?: SerializerSocialWorkEnrollmentDto;

  @Expose()  
  locationName: SerializerLocationDto;

  @Expose()
  appointmentDay: SerializerAppointmentDto[];
}
