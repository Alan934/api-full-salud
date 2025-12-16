import { ApiProperty } from '@nestjs/swagger';
import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn
} from 'typeorm';

export abstract class Base {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ example: '50436717-8608-4bff-bf41-373f14a8b888' })
  id: string;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
  })
  @ApiProperty({ example: null })
  deletedAt!: Date;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt!: Date;
}
