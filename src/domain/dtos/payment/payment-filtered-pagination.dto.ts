import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsInt } from 'class-validator';
import { PaginationDto } from '../../../common/dtos';

export class PaymentFilteredPaginationDto extends PaginationDto {
  
  @IsOptional()
  @IsInt()
  @ApiProperty({
    required: false,
    description: 'Filter by Payment Time (in minutes)',
    example: 30,
  })
  paymentTime?: number;
  
  @IsOptional()
  @IsUUID()
  @ApiProperty({
    required: false,
    description: 'Filter by Social Work ID',
    example: '1a2b3c4d-5e6f-0987-4321-fedcba987654',
  })
  socialWorkId?: string;

  @IsOptional()
  @IsUUID()
  @ApiProperty({
    required: false,
    description: 'Filter by Practitioner Role ID',
    example: 'abcd1234-abcd-1234-abcd-1234abcd5678',
  })
  practitionerRoleId?: string;


}
