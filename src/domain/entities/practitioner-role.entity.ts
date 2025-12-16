import { Base } from '../../common/bases/base.entity';
import { Column, Entity, JoinTable, ManyToMany } from 'typeorm';
import { Category, Practitioner } from '.';
import { ApiProperty } from '@nestjs/swagger';

@Entity('practitioner_role')
export class PractitionerRole extends Base {
  @Column({
    type: 'varchar',
    unique: true,
    nullable: false
  })
  @ApiProperty({ example: 'Medicina Clínica' })
  name: string;

  @Column({
    type: 'boolean',
    nullable: true,
    name: 'can_prescribe'
  })
  canPrescribe: boolean;

  @ManyToMany(() => Practitioner, (practitioner) => practitioner.practitionerRole)
  @ApiProperty({ type: () => [Practitioner] })
  practitioners: Practitioner[];

  @ManyToMany(() => Category, {
    eager: true,
    cascade: true,
    orphanedRowAction: 'soft-delete'
  })
  @JoinTable({
    name: 'practitionerRole_tags',
    joinColumn: {
      name: 'practitionerRole_id',
      referencedColumnName: 'id'
    },
    inverseJoinColumn: {
      name: 'tag_id',
      referencedColumnName: 'id'
    }
  })
  @ApiProperty({ type: () => [Category] })
  tags: Category[];
}
