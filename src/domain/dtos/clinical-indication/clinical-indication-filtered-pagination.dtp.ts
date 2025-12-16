import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../../common/dtos";

export class clinicalIndicationFilteredPaganited extends PaginationDto{
    @IsOptional()
    @IsString()
    @Type(() => String)
    @ApiProperty({ example: '2024-12-07' })
    start?: string;

    @IsOptional()
    @IsArray()
    indicationsDetails?: string[];
}