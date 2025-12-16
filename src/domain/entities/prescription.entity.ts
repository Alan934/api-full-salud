import { Base } from '../../common/bases/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { ClinicalIndication, Patient, Practitioner } from '.';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';

@Entity('prescription')
export class Prescription extends Base {
  @Column({
    type: 'date'
  })
  date: string;

  @ManyToOne(() => Patient, {
    eager: true,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'patient_id' })
  @ApiHideProperty()
  patient: Patient;

  @ManyToOne(() => Practitioner, {
    eager: true,
    nullable: true
  })
  @JoinColumn({ name: 'practitioner_id' })
  @ApiProperty({ type: () => Practitioner })
  practitioner: Practitioner;

  @Column({
    type: 'varchar',
    nullable: true
  })
  observations: string;

  @OneToMany(() => ClinicalIndication, (indication) => indication.prescription, {
    eager: true,
    cascade: true
  })
  @ApiProperty({ type: () => [ClinicalIndication] })
  indications?: ClinicalIndication[];
}
