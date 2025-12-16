import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { FullBaseDto, ShortBaseDto } from '../../../common/dtos';
import {
  SerializerShortorganizationDto,
  SerializerAddressDto,
  SerializerAppointmentSlotDto,
  SerializerLocationDto
} from '..';

export class SerializerBranchDto extends FullBaseDto {
  @Expose()
  @ApiProperty({ example: '30701234567' })
  cuit: string;

  @Expose()
  @ApiProperty({ example: 'Centro Médico' })
  businessName: string;

  @Expose()
  @ApiProperty({ example: '123456789' })
  phone: string;

  @Expose()
  @Type(() => SerializerShortorganizationDto)
  organization: SerializerShortorganizationDto;

  @Expose()
  @Type(() => SerializerLocationDto)
  location: SerializerLocationDto;

  @Expose()
  @Type(() => SerializerAddressDto)
  address: SerializerAddressDto;

  @Expose()
  @Type(() => SerializerAppointmentSlotDto)
  appointmentSlot: SerializerAppointmentSlotDto[];
}

export class SerializerShortBranchDto extends ShortBaseDto {
  @Expose()
  @ApiProperty({ example: 'Centro Médico' })
  businessName: string;
}
