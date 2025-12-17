import { Base } from '../../common/bases/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { Appointment } from './appointment.entity';
import { Practitioner } from './practitioner.entity';
import { TypeAppointmentAvailability } from './type-appointment-availability.entity';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';

@Entity('type_appointment')
export class TypeAppointment extends Base {
  @Column({ type: 'varchar', nullable: true })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  color: string;

  @Column({ type: 'text', nullable: true })
  instructions: string;

  @OneToMany(() => Appointment, (appointment) => appointment.typeAppointment)
  @ApiHideProperty()
  appointments: Appointment[];

  @Column({ name: 'practitioner_id', type: 'uuid', nullable: true })
  practitionerId?: string; 

  @ManyToOne(() => Practitioner, { nullable: true })
  @JoinColumn({ name: 'practitioner_id' })
  @ApiHideProperty()
  practitioner?: Practitioner;

  @OneToMany(() => TypeAppointmentAvailability, (availability) => availability.typeAppointment, )
  @ApiHideProperty()
  availabilities?: TypeAppointmentAvailability[];
} 