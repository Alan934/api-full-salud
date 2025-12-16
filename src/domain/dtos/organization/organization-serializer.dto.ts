import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { FullBaseDto, ShortBaseDto } from '../../../common/dtos';
import { SerializerorganizationTypeDto, SerializerValueAddedTaxDto } from '..';

export class SerializerOrganizationDto extends FullBaseDto {
  @Expose()
  @ApiProperty({ example: '30701234567' })
  cuit: string;

  @Expose()
  @ApiProperty({ example: 'Centro Médico' })
  businessName: string;

  @Expose()
  @Type(() => SerializerValueAddedTaxDto)
  iva: SerializerValueAddedTaxDto;

  @Expose()
  @Type(() => SerializerorganizationTypeDto)
  organizationType: SerializerorganizationTypeDto;
}

export class SerializerShortorganizationDto extends ShortBaseDto {
  @Expose()
  @ApiProperty({ example: 'Centro Médico' })
  businessName: string;

  @Expose()
  @Type(() => SerializerorganizationTypeDto)
  organizationType: SerializerorganizationTypeDto;
}
