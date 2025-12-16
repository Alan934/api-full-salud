import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import { PartialType } from "@nestjs/swagger";
import { Day } from "../../../domain/enums";

export class CreateTypeAppointmentAvailabilityDto {
    @IsNotEmpty()
    @IsEnum(Day)
    @ApiProperty({
    examples: [
        Day.SUNDAY,
        Day.MONDAY,
        Day.TUESDAY,
        Day.WEDNESDAY,
        Day.THURSDAY,
        Day.FRIDAY,
        Day.SATURDAY
    ]
    })
    day: Day;

    @IsOptional()
    @IsString()
    @ApiProperty({ example: '09:00' })
    startTime?: string;

    @IsNotEmpty()
    @IsString()
    @ApiProperty({ example: '17:00' })
    endTime: string;

    @IsNotEmpty()
    @IsUUID()
    @ApiProperty({ example: 'a3e19e4d-9c73-4f94-bc1b-6c0bb24afc89' })
    typeAppointmentId: string;
}

export class UpdateTypeAppointmentAvailabilityDto extends PartialType(CreateTypeAppointmentAvailabilityDto) {}