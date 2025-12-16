import { CreateAddressDto, UpdateAddressDto, CreateAppointmentSlotDto } from '..';
import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsUUID,
  ValidateIf,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLocationDto {
  @IsNotEmpty()
  @ApiProperty({
    example: 'Consultorio del Parque'
  })
  name: string;

  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    example: '2615623164'
  })
  phone?: string;

  @ValidateNested()
  @IsOptional()
  @Type(() => CreateAddressDto)
  address?: CreateAddressDto;

  @IsOptional()
  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'ID de la branch a la que pertenece la location'
  })
  branchId: string;

  @ValidateNested({ each: true })
  @Type(() => CreateAppointmentSlotDto)
  @IsOptional()
  @ApiProperty({ type: [CreateAppointmentSlotDto] })
  appointmentSlot?: CreateAppointmentSlotDto[];
}

export class CreateLocationWithIdDto extends CreateAddressDto {
  @IsOptional()
  @IsUUID()
  @ValidateIf((dto) => !dto.name && !dto.phone && !dto.address)
  /*
    @IsUUID()
    @IsOptionalIf(dto => dto.name && dto.address)
    */
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id?: string;
}

export class UpdatelocationDto extends PartialType(
  OmitType(CreateLocationDto, ['address'] as const)
) {
  //recibe opcionalmente una dirección actualizada
  @ValidateNested()
  @IsOptional()
  @Type(() => UpdateAddressDto)
  @ApiProperty({
    description:
      'Debe incluir el id de address para el correcto guardado de datos'
  })
  address?: UpdateAddressDto;
}
