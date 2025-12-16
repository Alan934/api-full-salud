import {
  Base,
} from '../../common/bases/base.entity';
import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import {
  Practitioner,
  Patient,
  AppointmentSlot,
  AppointmentSlotSchedule,
  TypeAppointment,
  MedicationRequest
} from '.';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { AppointmentStatus } from '../enums/appointment-status.enum';

// Esta entidad anteriormente se denominaba Turn
@Entity('appointment')
export class Appointment extends Base {
  @Column({ type: 'varchar' })
  date: string;

  @Column({ type: 'varchar' })
  hour: string;

  @Column({
    type: 'varchar',
    nullable: true
  })
  @ApiProperty({
    example: 'dolor de pecho opresivo que se irradia hacia el brazo izquierdo, dificultad para respirar y sudoración excesiva'
  })
  observation?: string;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    nullable: false,
    default: AppointmentStatus.PENDING
  })
  @ApiProperty({
    examples: [
      AppointmentStatus.APPROVED,
      AppointmentStatus.CANCELLED,
      AppointmentStatus.COMPLETED,
      AppointmentStatus.NO_SHOW,
      AppointmentStatus.PENDING,
      AppointmentStatus.UNDER_REVIEW
    ],
    default: AppointmentStatus.PENDING
  })
  status: AppointmentStatus;

  @ManyToOne(() => Patient, (patient) => patient, {
    eager: false,
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'patient_id' })
  @ApiHideProperty()
  patient?: Patient;
  
  @ManyToOne(() => Practitioner, { eager: true, nullable: true })
  @JoinColumn({ name: 'practitioner_id' })
  @ApiProperty({ type: () => Practitioner })
  practitioner: Practitioner;

  @Column({
    type: 'float',
    nullable: true,
    name: 'custom_duration',
    default: null
  })
  customDuration?: number;

  @OneToMany(() => MedicationRequest, (medicationRequest) => medicationRequest.appointment)
  @ApiProperty({ type: () => [MedicationRequest] })
  medicationRequests: MedicationRequest[];

  @Column({ type: 'varchar', nullable: true })
  email3?: string;

  @Column({ type: 'varchar', nullable: true })
  email24?: string;

  @Column({ type: 'varchar', nullable: true })
  whats3?: string;

  @Column({ type: 'varchar', nullable: true })
  whats24?: string;

  @Column({ type: 'boolean', nullable: true, default: false})
  reprogrammed?: boolean;

  @ManyToOne(() => TypeAppointment, (typeAppointment) => typeAppointment.appointments, {
    eager: false,
    nullable: true
  })
  @JoinColumn({ name: 'type_appointment_id' })
  @ApiProperty({ type: () => TypeAppointment })
  typeAppointment?: TypeAppointment;
  
  @ManyToOne(() => AppointmentSlot, { nullable: true })
  @JoinColumn({ name: 'slot_id' })
  @ApiProperty({ type: () => AppointmentSlot })
  slot: AppointmentSlot;

  @ManyToOne(() => AppointmentSlotSchedule, { nullable: true })
  @JoinColumn({ name: 'schedule_id' })
  @ApiProperty({ type: () => AppointmentSlotSchedule })
  schedule: AppointmentSlotSchedule;


}

