import { Base } from '../../common/bases/base.entity';
import { Entity, Column, ManyToOne, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import { Day } from '../enums';
import { ApiProperty } from '@nestjs/swagger';
import { Appointment, Branch, Location, Practitioner, AppointmentSlotSchedule } from '.';
import { IsOptional } from 'class-validator';

//Esta entidad antes se denominaba attentionHour
@Entity('appointment_slot')
export class AppointmentSlot extends Base {

  @ManyToMany(() => AppointmentSlotSchedule, interval => interval.appointmentSlots, { cascade: ['insert'] })
  @JoinTable()
  @ApiProperty({ type: () => [AppointmentSlotSchedule] })
  schedules: AppointmentSlotSchedule[];

  @Column({
    type: 'float',
    default: 30,
    name: 'duration_appointment'
  })
  durationAppointment: number;

  @Column({
    type: 'enum',
    enum: Day
  })
  @ApiProperty({
    examples: [
      Day.SUNDAY,
      Day.MONDAY,
      Day.TUESDAY,
      Day.WEDNESDAY,
      Day.THURSDAY,
      Day.FRIDAY,
      Day.SATURDAY
    ]
  })
  day: Day;

  @ManyToOne(() => Practitioner, (practitioner) => practitioner.appointmentSlots)
  @JoinColumn({ name: 'practitioner_id' })
  @ApiProperty({ type: () => Practitioner })
  practitioner: Practitioner;

  @ManyToOne(() => Branch, (branch) => branch.appointmentSlot)
  @JoinColumn({ name: 'branch_id' })
  @ApiProperty({ type: () => Branch })
  branch: Branch;

  @ManyToOne(() => Location, (location) => location.appointmentSlots)
  @JoinColumn({ name: 'location_id' })
  @ApiProperty({ type: () => Location })
  location: Location;

  @Column({ nullable: true })
  @IsOptional()
  locationId?: string;

  @Column({
    type: 'boolean',
    default: false,
    name: 'unavailable'
  })
  @ApiProperty({
    example: false,
    description: 'true → el horario no debe ofrecerse (front/back)'
  })
  unavailable: boolean;
}
