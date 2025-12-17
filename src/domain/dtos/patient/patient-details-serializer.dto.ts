import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { SerializerShortFamilyGroupDto } from '../family-group/family-group-serializer.dto';
import { SerializerPatientDto, SerializerShortPatientDto } from './patient-serializer.dto';
import { SecondOptimizeShortUserDto } from '../user/user-serializer.dto';

export class SerializerPatientFamilyMemberDto extends SecondOptimizeShortUserDto {
  // No relaciones como familyGroup ni socialWork para evitar redundancia
}

export class SerializerPatientDetailsDto extends SerializerShortPatientDto {
  @Expose()
  @Type(() => SerializerShortFamilyGroupDto)
  @ApiProperty({ type: () => SerializerShortFamilyGroupDto, required: false })
  familyGroup?: SerializerShortFamilyGroupDto;

  @Expose()
  @Type(() => SerializerPatientFamilyMemberDto)
  @ApiHideProperty()
  familyMembers?: SerializerPatientFamilyMemberDto[];
}