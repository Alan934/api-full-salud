import { ApiProperty } from "@nestjs/swagger";
import { Expose, Transform, Type } from "class-transformer";
import { SerializerPractitionerRoleDto, SerializerShortPractitionerRoleDto } from "../practitioner-role/practitioner-role-serializer.dto";
import { OptimizePractitionerSocialWorkDto, PractitionerSocialWorkSerializerDto } from "../practitioner-social-work/practitioner-social-work-serializer.dto";
import { Gender } from "../../../domain/enums";
import { SerializerSocialWorkEnrollmentDto } from "../social-work-enrollment/social-work-enrollment-serializer.dto";
import { SocialWorkEnrollment } from "../../../domain/entities";
import { SerializerLocationDto } from "../location/location-serializer.dto";
import { OptimizeShortUserDto } from "../user/user-serializer.dto";
import { SerializerVeryShortLocationDto } from "../location/location-serializer-veryShort.dto";
import { modePractitioner } from "../../enums/mode-practitioner.enum";
import { SerializerShortAppointmentSlotDto } from "../appointment-slot/appointment-slot-serializer.dto";

export class OptimizePractitionerDto {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  urlImg: string;

  @Expose()
  @ApiProperty()
  name: string;

  @Expose()
  @ApiProperty()
  lastName: string;

  @Expose()
  @ApiProperty()
  license: string;

  @Expose()
  @Type(() => SerializerPractitionerRoleDto)
  @ApiProperty({ type: () => [SerializerPractitionerRoleDto] })
  practitionerRole: SerializerPractitionerRoleDto[];

  @Expose()
  @Type(() => OptimizePractitionerSocialWorkDto)
  @ApiProperty({ type: () => [OptimizePractitionerSocialWorkDto] })
  practitionerSocialWorks: OptimizePractitionerSocialWorkDto[];

  @Expose()
  @ApiProperty({ enum: modePractitioner })
  mode: modePractitioner;

  @Expose()
  @Type(() => SerializerShortAppointmentSlotDto)
  appointmentSlots: SerializerShortAppointmentSlotDto[];

}


class ShortPractitionerAppointmentDto {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @Type(() => SerializerVeryShortLocationDto)
  @ApiProperty({ type: SerializerVeryShortLocationDto, required: false })
  location?: SerializerVeryShortLocationDto;
}

export class SecondOptimizePractitionerDto {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  name: string;

  @Expose()
  @ApiProperty()
  lastName: string;

  @Expose()
  @ApiProperty()
  license: string;

  @Expose()
  @Transform(({ obj }) => obj.practitionerAppointment?.[0]?.location ?? null)
  @Type(() => SerializerVeryShortLocationDto)
  @ApiProperty({ type: SerializerVeryShortLocationDto, required: false })
  location?: SerializerVeryShortLocationDto;

}

export class thirdOptimizePractitionerDto {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  name: string;

  @Expose()
  @ApiProperty()
  lastName: string;

  @Expose()
  @ApiProperty()
  license: string;

}