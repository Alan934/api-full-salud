import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import {
  SerializerShortAddressDto,
  SerializerShortFamilyGroupDto,
  SerializerSocialWorkEnrollmentDto,
} from '..';
import { OptimizeShortUserDto, SecondOptimizeShortUserDto, SerializerUserDto } from '../user/user-serializer.dto';

export class SerializerPatientDto extends SerializerUserDto {

  @Expose()
  @ApiProperty({ example: 'Patient' })
  resourceType: string = 'Patient';

  @Expose()
  @Type(() => SerializerShortAddressDto)
  addresses: SerializerShortAddressDto[];

  @Expose()
  @ApiProperty({ example: '50436717-8608-4bff-bf41-373f14a8b888', description: 'UUID del grupo familiar al que pertenece el paciente', required: false })
  familyGroupId?: string;

  @Expose()
  @Type(() => SerializerShortFamilyGroupDto)
  @ApiHideProperty()
  familyGroup?: SerializerShortFamilyGroupDto;
}

export class OptimizeSerializerPatientDto extends OptimizeShortUserDto {
}

export class SecondOptimizeSerializerPatientDto extends OptimizeShortUserDto {
  @Expose()
  @Type(() => SerializerSocialWorkEnrollmentDto)
  socialWorkEnrollment: SerializerSocialWorkEnrollmentDto;
}

export class ThirdOptimizeSerializerPatientDto extends SecondOptimizeShortUserDto {
  @Expose()
  @Type(() => SerializerSocialWorkEnrollmentDto)
  socialWorkEnrollment: SerializerSocialWorkEnrollmentDto;
}

export class SerializerShortPatientDto extends SerializerPatientDto {
  @Exclude()
  @Type(() => SerializerShortAddressDto)
  addresses: SerializerShortAddressDto[];
}
