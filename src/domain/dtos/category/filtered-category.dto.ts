import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../common/dtos';

export class FilteredCategoryDto extends PaginationDto {
  @IsOptional()
  @ApiProperty({ example: 'Salud Mental' })
  name: string;

  @IsOptional()
  @IsUUID()
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef' })
  categoryId: string
}