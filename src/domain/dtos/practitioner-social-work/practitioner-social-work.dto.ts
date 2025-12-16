import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNumber, Min, IsOptional } from 'class-validator';

export class CreatePractitionerSocialWorkDto {
  @IsUUID()
  @ApiProperty({ example: 'uuid-del-practitioner', description: 'ID of the Practitioner' })
  practitionerId: string;

  @IsUUID()
  @ApiProperty({ example: 'uuid-de-la-obra-social', description: 'ID of the Social Work' })
  socialWorkId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @ApiProperty({ example: 1500.00, description: 'Price for this social work by the practitioner' })
  price: number;
}

export class UpdatePractitionerSocialWorkDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @ApiProperty({ example: 1600.00, description: 'Updated price for this social work', required: false })
  price?: number;
}