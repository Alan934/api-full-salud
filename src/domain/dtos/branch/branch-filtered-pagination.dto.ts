import { IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dtos/pagination-common.dto';

export class BranchFilteredPaginationDto extends PaginationDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @Type(() => Boolean)
  isMainBranch?: boolean;
}
