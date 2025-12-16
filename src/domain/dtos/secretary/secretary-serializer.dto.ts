import { FullBaseDto } from '../../../common/dtos';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { Role } from '../../enums/role.enum';

export class SerializerSecretaryDto extends FullBaseDto {
  @Expose()
  @ApiProperty({ example: 'Secretary' })
  resourceType?: string = 'Secretary';

  @Expose()
  @ApiProperty({ enum: Role, example: Role.SECRETARY })
  role: Role;

  @Expose()
  @ApiProperty({ example: 'Carlos' })
  name: string;

  @Expose()
  @ApiProperty({ example: 'Gonzales' })
  lastName: string;

  @Expose()
  @ApiProperty({ example: 'lucas@example.com' })
  email?: string | null;
}

export class SerializerShortSecretaryDto extends FullBaseDto {
  @Expose()
  @ApiProperty({ example: 'Secretary' })
  resourceType?: string = 'Secretary';

  @Expose()
  @ApiProperty({ enum: Role, example: Role.SECRETARY })
  role: Role;
}
