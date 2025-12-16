import { ApiProperty } from '@nestjs/swagger';
import { Base } from '../../common/bases/base.entity';
import { Column, Entity } from 'typeorm';

//Esta entidad anteriormente se denominaba professionalDegree
@Entity('professional_professionalDegree')
export class ProfessionalDegree extends Base {
  @Column({
    type: 'varchar',
    unique: true,
    nullable: false
  })
  @ApiProperty({ example: 'Doctor' })
  professionalDegree: string;
}
