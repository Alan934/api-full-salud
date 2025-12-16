import { FullBaseDto } from '../../../common/dtos';
import {
  SerializerLocationDto,
  SerializerPractitionerDto,
  SerializerShortLocationDto,
  SerializerShortPractitionerDto,
} from '..';
import { SerializerPractitionerDtoShort } from '../practitioner/practitioner-serealizer-short';
import { SerializerSecretaryDto } from '../secretary/secretary-serializer.dto';
import { Expose, Type } from 'class-transformer';
import { ApiProperty, OmitType } from '@nestjs/swagger';
import { SerializerVeryShortLocationDto } from '../location/location-serializer-veryShort.dto';

export class SerializerPractitionerSecretaryDto extends FullBaseDto {

  @Expose()
  @ApiProperty({ example: 'Practitioner_Secretary' })
  resourceType?: string = 'Practitioner_Secretary';

  @Expose()
  @Type(() => SerializerPractitionerDtoShort)
  practitioner: SerializerPractitionerDtoShort;

  @Expose()
  @Type(() => SerializerSecretaryDto)
  secretary: SerializerSecretaryDto;

  @Expose()
  @Type(() => SerializerVeryShortLocationDto)
  location: SerializerVeryShortLocationDto;
}

// export class SerializerShortSpecialistSecretaryDto extends OmitType(
//   FullBaseDto,
//   ['createdAt', 'deletedAt'] as const
// ) {
//   @Expose()
//   @Type(() => SerializerShortPractitionerDto)
//   person: SerializerShortPractitionerDto;

//   @Expose()
//   @Type(() => SerializerShortLocationDto)
//   location: SerializerShortLocationDto;
// }
