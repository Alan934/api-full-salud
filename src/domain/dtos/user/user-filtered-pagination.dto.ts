import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dtos';
import { Filter } from '../../../common/util/dynamic-query-builder.util';
import { Role } from '../../enums';

export class UserPaginationDto extends PaginationDto implements Filter {
  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Fracción o email completo del usuario',
    example: 'maria@gmail.com'
  })
  email?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Fracción o username completo del usuario',
    example: 'Maria1234!'
  })
  username?: string;

  @IsOptional()
  @IsEnum(Role)
  @ApiProperty({
    examples: [Role.PATIENT, Role.ADMIN, Role.ORGANIZATION, Role.PRACTITIONER]
  })
  role?: Role;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ example: false })
  googleBool?: boolean;
}
