import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { ShortBaseDto } from '../../../common/dtos';

export class CreateChargeItemDto {
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Type(() => Number)
  @ApiProperty({ example: '8000' })
  price: number;

  //recibe el id del especialista
  // @ValidateNested()
  // @Type(() => ShortBaseDto)
  @IsNotEmpty()
  @IsUUID()
  practitionerId: string;

  //recibe el id de la practica
  // @ValidateNested()
  // @Type(() => ShortBaseDto)
  @IsNotEmpty()
  @IsUUID()
  procedureId: string;
}

//no permite actualizar procedure ni specialist, solo el price
export class UpdateChargeItemDto{
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Type(() => Number)
  price: number;

  @IsOptional()
  @IsUUID()
  practitionerId: string;

  @IsOptional()
  @IsUUID()
  procedureId: string;
}
