import {
  IsNotEmpty,
  ValidateNested,
  IsOptional,
  IsString,
  IsUUID
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateClinicalIndicationDetailDto } from '../clinical-indication-detail/clinical-indication-detail.dto';

export class CreateClinicalIndicationDto {
  @IsOptional()
  @IsString()
  @Type(() => String)
  @ApiProperty({ example: '2024-12-07' })
  start: string;

  // @IsNotEmpty()
  // @ValidateNested()
  // @Type(() => ShortBaseDto)
  // @ApiProperty({ description: 'Medicina que se receta.' })
  // medicine: ShortBaseDto;

  @IsOptional()
  @IsUUID()
  prescriptiondId: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateClinicalIndicationDetailDto)
  @ApiProperty({ description: 'Detalles de las indicaciones' })
  indicationsDetails: CreateClinicalIndicationDetailDto[];
}

export class UpdateClinicalIndicationDto {
  @IsOptional()
  @IsString()
  @Type(() => String)
  @ApiProperty({ example: '2024-12-07' })
  start: string;

  @IsOptional()
  @IsUUID()
  prescriptiondId: string;

  @IsOptional()
  //@IsUUID()
  @ApiProperty({ description: 'Id de detalles de las indicaciones' })
  indicationsDetails: CreateClinicalIndicationDetailDto[];
}