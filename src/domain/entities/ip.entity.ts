import { Base } from '../../common/bases/base.entity';
import { Column, Entity } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('ip')
export class Ip extends Base {
  @Column({
    type: 'varchar',
    nullable: false
  })
  @ApiProperty({ example: '291.655.156.02' })
  ip: string;

  @Column({ type: 'boolean', default: false, nullable: true })
  @ApiProperty({ example: false, required: false, description: 'Indica si la IP está en blacklist' })
  blacklist?: boolean;

  @Column({ type: 'int', default: 1 })
  @ApiProperty({ example: 1, description: 'Contador de accesos diarios' })
  dailyCount: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @ApiProperty({ example: '2025-06-24T10:00:00Z', description: 'Fecha del último acceso' })
  lastAccessDate: Date;
}
