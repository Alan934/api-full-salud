import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { ShortBaseDto } from '../../../common/dtos';

export class SerializerorganizationTypeDto extends ShortBaseDto {
  @Expose()
  @ApiProperty({ example: 'Diagnostico por imagenes' })
  type: string;
}
