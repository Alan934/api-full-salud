import { Secretary } from './../../entities/secretary.entity';
import { FullBaseDto } from '../../../common/dtos';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShortBaseDto } from '../../../common/dtos';

export class CreatePractitionerSecretaryDto{
  @ApiProperty({ description: 'Practitioner ID' })
  @ValidateNested()
  @IsNotEmpty()
  @Type(() => ShortBaseDto)
  practitioner: ShortBaseDto;

  @ApiProperty({ description: 'Location ID' })
  @ValidateNested()
  @IsNotEmpty()
  @Type(() => ShortBaseDto)
  location: ShortBaseDto;

  @ApiProperty({description: 'Secretary ID'})
  @ValidateNested()
  @IsNotEmpty()
  @Type(() => ShortBaseDto)
  secretary: ShortBaseDto;

}

export class UpdatePractitionerSecretaryDto {
  @ApiPropertyOptional({ description: 'Location ID' })
  @ValidateNested()
  @IsOptional()
  @Type(() => ShortBaseDto)
  location?: ShortBaseDto;
}
