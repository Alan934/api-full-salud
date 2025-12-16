import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsString, IsUUID, ValidateNested } from 'class-validator';
import { ShortBaseDto } from '../../../common/dtos';

export class CreateNotificationDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'Su turno para Dermatología está en revisión' })
  text: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'Estado turno' })
  title: string;

  @IsNotEmpty()
  @IsUUID()
  @ApiProperty({ example: 'uuid-del-usuario' })
  userId?: string; // Cambiado a userId directamente

  @IsNotEmpty()
  @IsUUID()
  @ApiProperty({ example: 'uuid-del-usuario' })
  patientId?: string; 

  @IsNotEmpty()
  @IsUUID()
  @ApiProperty({ example: 'uuid-del-usuario' })
  practitionerId?: string; 

  //@IsNotEmpty()
  @IsBoolean()
  @ApiProperty({ example: 'false' })
  read: boolean;

  //recibe el id del usuario
  // @IsNotEmpty()
  // @ValidateNested()
  // @Type(() => ShortBaseDto)
  // user?: ShortBaseDto;
}

export class UpdateNotificationDto extends PartialType(
  CreateNotificationDto
  //OmitType(CreateNotificationDto, ['user'] as const)
) {}

export class ReturnNotificationDto {
  @IsString()
  @ApiProperty({ example: 'Su turno para Dermatología está en revisión' })
  text: string;

  @IsString()
  @ApiProperty({ example: 'Estado turno' })
  title: string;

  @IsBoolean()
  @ApiProperty({ example: 'true' })
  read: boolean;

}
