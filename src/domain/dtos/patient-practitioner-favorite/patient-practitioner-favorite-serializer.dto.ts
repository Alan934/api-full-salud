import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { FullBaseDto } from "../../../common/dtos";
import {
  SerializerShortPatientDto,
  } from '..';
  import { SerializerShortPractitionerDto } from '../practitioner/practitioner-serializer.dto';
export class SerializerPatientPractitionerFavoriteDto extends FullBaseDto {
    @Expose()
    @ApiProperty({ example: true })
    enabled: boolean;

    //ver modificar serializerUSerDto a shortIdUserDto
    @Expose()
    @Type(() => SerializerShortPatientDto)
    patient: SerializerShortPatientDto

    @Expose()
    @Type(() => SerializerShortPractitionerDto)
    practitioner: SerializerShortPractitionerDto

}
