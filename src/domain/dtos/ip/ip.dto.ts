import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateIpDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: '182.564.25.02' })
  ip: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ example: false, required: false, description: 'Indica si la IP está en blacklist' })
  blacklist?: boolean;
}

export class UpdateIpDto extends PartialType(CreateIpDto) {}
