import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { ShortBaseDto } from '../../../common/dtos';

export class SerializerNotificationDto extends ShortBaseDto {
  @Expose()
  @ApiProperty({ example: 'Su turno para Dermatología está en revisión' })
  text: string;

  @Expose()
  @ApiProperty({ example: 'Estado turno' })
  title: string;

  @Expose()
  @ApiProperty({ example: 'true' })
  read: boolean;
}
