import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator';
import { ShortBaseDto } from '../../../common/dtos';
import { CreateAddressWithIdDto, CreateAppointmentSlotDto } from '..';

export class CreateBranchDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: '30701234567' })
  cuit: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'Centro Médico' })
  businessName: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: '123456789' })
  phone: string;

  @IsOptional()
  @IsNotEmpty()
  @Type(() => ShortBaseDto)
  @ValidateNested()
  organization: ShortBaseDto;

  @IsOptional()
  @IsNotEmpty()
  @Type(() => CreateAddressWithIdDto)
  @ValidateNested()
  address: CreateAddressWithIdDto;

  @IsOptional()
  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty({
    example: 'false',
    description: 'Marca a una sede como principal',
    default: false
  })
  isMainBranch: boolean;

  @ValidateNested()
  @IsOptional()
  @Type(() => CreateAppointmentSlotDto)
  appointmentSlot?: CreateAppointmentSlotDto[];
}

export class UpdateBranchDto extends PartialType(
  OmitType(CreateBranchDto, ['organization'] as const)
) {}
