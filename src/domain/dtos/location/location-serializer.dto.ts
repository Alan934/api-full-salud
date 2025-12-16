import { FullBaseDto } from '../../../common/dtos';
import { SerializerAddressDto, SerializerShortPractitionerDto, SerializerBranchDto } from '..';
import { Expose, Type } from 'class-transformer';
import { ApiProperty, OmitType } from '@nestjs/swagger';

export class SerializerLocationDto extends FullBaseDto {
  
  @Expose()
  @ApiProperty({
    example: 'Consultorio del Parque'
  })
  name: string;

  @Expose()
  @ApiProperty({
    example: '2615623164'
  })
  phone?: string;

  @Expose()
  @Type(() => SerializerAddressDto)
  address: SerializerAddressDto;

  @Expose()
  @Type(() => SerializerShortPractitionerDto)
  practitioner: SerializerShortPractitionerDto;

  @Expose()
  @Type(() => SerializerBranchDto)
  branch: SerializerBranchDto;
}

export class SerializerShortLocationDto extends OmitType(SerializerLocationDto, [
  'createdAt',
  'deletedAt',
  'address'
] as const) {}
