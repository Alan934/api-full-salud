import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Patient } from './patient.entity';
import { Expose } from 'class-transformer';
import { ApiProperty, ApiHideProperty } from '@nestjs/swagger';
import { Base } from '../../common/bases/base.entity';

@Entity('family_group')
export class FamilyGroup extends Base {

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'family_group_name'
  })
  @ApiProperty({ example: 'Familia García', description: 'Nombre del grupo familiar', required: false })
  familyGroupName?: string;

  @Column({
    type: 'text',
    nullable: true,
    name: 'family_description'
  })
  @ApiProperty({ example: 'Familia compuesta por padres e hijos', description: 'Descripción del grupo familiar', required: false })
  familyDescription?: string;

  @Column({
    type: 'boolean',
    default: true,
    nullable: true,
    name: 'is_active'
  })
  @ApiProperty({ example: true, description: 'Indica si el grupo familiar está activo', required: false })
  isActive?: boolean;

  @Column({
    type: 'uuid',
    nullable: true,
    name: 'head_patient_id'
  })
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', description: 'ID del paciente cabeza de familia', required: false })
  headPatientId?: string;

  @Expose()
  @ManyToOne(() => Patient, {
    eager: true,
    nullable: true,
    onDelete: 'SET NULL'
  })
  @JoinColumn({ name: 'head_patient_id' })
  @ApiHideProperty()
  headPatient?: Patient;

  @Expose()
  @OneToMany(() => Patient, (patient) => patient.familyGroup, {
    cascade: ['insert', 'update'],
    onDelete: 'SET NULL'
  })
  @ApiHideProperty()
  familyMembers?: Patient[];

}