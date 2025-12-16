import { ApiProperty } from '@nestjs/swagger';
import { SerializerNotificationDto } from './notification-serializer.dto';

export class PaginatedNotificationDto {
  @ApiProperty({ type: [SerializerNotificationDto] })
  notifications: SerializerNotificationDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  previousPage: number | null;
}
