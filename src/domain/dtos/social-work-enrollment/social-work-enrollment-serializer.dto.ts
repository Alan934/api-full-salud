import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ShortBaseDto } from '../../../common/dtos';
import { SerializerShortSocialWorkDto, SerializerSocialWorkDto } from '..';

export class SerializerSocialWorkEnrollmentDto extends ShortBaseDto {
  @Expose()
  @ApiProperty({ example: '12345678' })
  memberNum: string;

  @Expose()
  @ApiProperty({ example: 'A35' })
  plan: string;

  @Expose()
  @Type(() => SerializerShortSocialWorkDto)
  @ApiProperty({ type: () => SerializerShortSocialWorkDto})
  socialWork?: SerializerShortSocialWorkDto;
}
