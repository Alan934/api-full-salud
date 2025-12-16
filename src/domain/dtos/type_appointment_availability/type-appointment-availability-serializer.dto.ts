import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { ShortBaseDto } from '../../../common/dtos';
import { Day } from '../../enums';
import { IsOptional } from 'class-validator';

export class SerializerTypeAppointmentAvailabilityDto extends ShortBaseDto {
  @Expose()
  @IsOptional()
  @ApiProperty({
    enum: Day,
    example: Day.MONDAY,
    description: 'Día de la semana'
  })
  day?: Day;

  @Expose()
  @IsOptional()
  @ApiProperty({ example: '09:00', description: 'Hora de inicio' })
  startTime?: string;

  @Expose()
  @IsOptional()
  @ApiProperty({ example: '17:00', description: 'Hora de fin' })
  endTime?: string;

  @Expose()
  @IsOptional()
  @ApiProperty({ example: 'a3e19e4d-9c73-4f94-bc1b-6c0bb24afc89' })
  typeAppointmentId?: string;
}
