import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID } from "class-validator";
import { PaginationDto } from "../../../common/dtos";

export class ChargeItemPaginatedDTO extends PaginationDto{

    @IsOptional()
    @IsString()
    @ApiProperty({
        required: false,
        description: 'Filter by Price',
        example: '3500',
        })
    price: number;

    @IsOptional()
    @IsUUID()
    @ApiProperty({
    required: false,
    description: 'Filter by Practitioner ID',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    })
    practitionerId: string;


    @IsOptional()
    @IsUUID()
    @ApiProperty({
    required: false,
    description: 'Filter by Procedure ID',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    })
    procedureId: string;


}