import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { FullBaseDto } from '../../../common/dtos';
import { ShortSerializerPractitionerDto } from '../practitioner/practitioner-serializer.dto';
import { SerializerSocialWorkDto } from '../social-work/social-work-serializer.dto';

export class PractitionerSocialWorkSerializerDto extends FullBaseDto {
  @Expose()
  @ApiProperty({ example: 1500.00 })
  price: number;

  @Expose()
  @ApiProperty({ example: 'uuid-del-practitioner' })
  practitionerId: string;

  @Expose()
  @ApiProperty({ example: 'uuid-de-la-obra-social' })
  socialWorkId: string;
  
  @Expose()
  @Type(() => ShortSerializerPractitionerDto)
  @ApiProperty({ type: () => ShortSerializerPractitionerDto })
  practitioner: ShortSerializerPractitionerDto;

  @Expose()
  @Type(() => SerializerSocialWorkDto)
  @ApiProperty({ type: () => SerializerSocialWorkDto })
  socialWork: SerializerSocialWorkDto;
}

export class OptimizePractitionerSocialWorkDto extends FullBaseDto {
  @Expose()
  @ApiProperty({ example: 1500.00 })
  price: number;

  @Expose()
  @ApiProperty({ example: 'uuid-del-practitioner' })
  practitionerId: string;

  @Expose()
  @ApiProperty({ example: 'uuid-de-la-obra-social' })
  socialWorkId: string;

  @Expose()
  @Type(() => SerializerSocialWorkDto)
  @ApiProperty({ type: () => SerializerSocialWorkDto })
  socialWork: SerializerSocialWorkDto;
}