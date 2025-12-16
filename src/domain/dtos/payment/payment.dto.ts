import { OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional } from 'class-validator';
import { ShortBaseDto } from '../../../common/dtos';

export class CreatePaymentDto {
  @IsNotEmpty()
  @Type(() => Number)
  paymentTime: number;

  @IsNotEmpty()
  @Type(() => ShortBaseDto)
  socialWork: ShortBaseDto;

  @IsNotEmpty()
  @Type(() => ShortBaseDto)
  practitionerRole: ShortBaseDto;
}

export class UpdatePaymentDto {
  @IsOptional()
  @IsInt()
  paymentTime?: number;

  @IsOptional()
  @Type(() => ShortBaseDto)
  socialWork?: ShortBaseDto;

  @IsOptional()
  @Type(() => ShortBaseDto)
  practitionerRole?: ShortBaseDto;  
}


