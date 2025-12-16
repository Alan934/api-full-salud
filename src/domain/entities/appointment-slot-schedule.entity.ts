import { Base } from "../../common/bases/base.entity";
import { AppointmentSlot } from "./appointment-slot.entity";
import { Column, Entity, ManyToMany, Unique } from "typeorm";
import { ApiProperty } from '@nestjs/swagger';

@Entity('appointment_slot_schedule')
@Unique(['openingHour', 'closeHour', 'overtimeStartHour'])
export class AppointmentSlotSchedule  extends Base {
  @ManyToMany(() => AppointmentSlot, slot => slot.schedules)
  @ApiProperty({ type: () => [AppointmentSlot] })
  appointmentSlots: AppointmentSlot[];

  @Column({ type: 'time' })
  openingHour: string;

  @Column({ type: 'time' })
  closeHour: string;

  @Column({ type: 'time', nullable: true })
  overtimeStartHour?: string;

}
