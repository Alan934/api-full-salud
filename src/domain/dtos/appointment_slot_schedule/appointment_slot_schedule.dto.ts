import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import { ShortBaseDto } from "../../../common/dtos";

export class CreateAppointmentSlotScheduleDto {

  @IsNotEmpty()
  @ApiProperty({ example: '09:00' })
  openingHour: string;

  @IsNotEmpty()
  @ApiProperty({ example: '13:30' })
  closeHour: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: '12:00', required: false, description: 'Hora de inicio de sobreturnos, debe estar entre openingHour y closeHour' })
  overtimeStartHour?: string;

}

// Permite usar schedules en updates aceptando id opcional
export class UpdateAppointmentSlotScheduleDto {
  @IsOptional()
  @IsUUID()
  @ApiProperty({ example: '2eef863d-8832-492b-a5a7-f51fda8f2f77', required: false })
  id?: string;

  @IsOptional()
  @ApiProperty({ example: '09:00', required: false })
  openingHour?: string;

  @IsOptional()
  @ApiProperty({ example: '13:30', required: false })
  closeHour?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: '12:00', required: false, description: 'Hora de inicio de sobreturnos, debe estar entre openingHour y closeHour' })
  overtimeStartHour?: string;
}

export class SerializerAppointmentSlotScheduleDto extends ShortBaseDto {
  @Expose()
  @ApiProperty({ example: '09:00' })
  openingHour: string;

  @Expose()
  @ApiProperty({ example: '13:30' })
  closeHour: string;

  @Expose()
  @ApiProperty({ example: '12:00', required: false })
  overtimeStartHour?: string;
}

export class FilterScheduleDto {
  @IsOptional()
  @IsString()
  openingHour?: string;

  @IsOptional()
  @IsString()
  closeHour?: string;

  @IsOptional()
  @IsString()
  overtimeStartHour?: string;
}