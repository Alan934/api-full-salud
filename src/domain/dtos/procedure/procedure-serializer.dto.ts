import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { FullBaseDto, ShortBaseDto } from '../../../common/dtos';

export class SerializerprocedureDto extends FullBaseDto {
  @Expose()
  @ApiProperty({ example: 'Consulta médica' })
  name: string;
}

export class SerializerShortprocedureDto extends ShortBaseDto {
  @Expose()
  @ApiProperty({ example: 'Consulta médica' })
  name: string;
}
