import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { ShortBaseDto } from '../../../common/dtos';

export class SerializerIpDto extends ShortBaseDto {
  @Expose()
  @ApiProperty({ example: '182.564.25.02' })
  ip: string;

  @Expose()
  @ApiProperty({ example: false, required: false, description: 'Indica si la IP está en blacklist' })
  blacklist?: boolean;

  @Expose()
  @ApiProperty({ example: 1, description: 'Contador de accesos diarios' })
  dailyCount: number;

  @Expose()
  @ApiProperty({ example: '2025-06-24T10:00:00Z', description: 'Fecha del último acceso' })
  lastAccessDate: Date;
}