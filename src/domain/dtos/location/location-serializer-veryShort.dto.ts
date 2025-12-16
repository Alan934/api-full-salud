import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { FullBaseDto } from "../../../common/dtos";
import { OptimizeSerializerAddressDto, SerializerAddressDto } from "../address/address-serializer.dto";

export class SerializerVeryShortLocationDto extends FullBaseDto {

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
  @Type(() => OptimizeSerializerAddressDto)
  address: OptimizeSerializerAddressDto;
}