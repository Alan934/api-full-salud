import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class AvailableTimeDto {
  @Expose()
  @ApiProperty({ example: '09:30', description: 'Available time in HH:MM format' })
  time: string;

  @Expose()
  @ApiProperty({ example: 'a9a9e2e0-5f0a-4b8a-92d8-1c2c3d4e5f6a', description: 'Slot ID to be used when booking' })
  slotId: string;

  @Expose()
  @ApiProperty({ example: 'b1b2c3d4-e5f6-7890-abcd-ef0123456789', description: 'Schedule ID to be used when booking' })
  scheduleId: string;

  @Expose()
  @ApiProperty({ example: false, required: false, description: 'Always false - only normal appointments are returned (not overtimes). If schedule has overtimeStartHour, only slots between openingHour and overtimeStartHour are shown.' })
  isOvertime?: boolean;
}

export class AvailableDayDto {
  @Expose()
  @ApiProperty({ example: '2025-08-01', description: 'Date in YYYY-MM-DD format' })
  date: string;

  @Expose()
  @Type(() => AvailableTimeDto)
  @ApiProperty({ type: [AvailableTimeDto], description: 'List of available times for this date' })
  available: AvailableTimeDto[];

  @Expose()
  @ApiProperty({ type: [String], description: 'List of booked appointment times for this date (HH:MM)' })
  booked: string[];
}