import { Base } from "../../common/bases/base.entity";
import { Column, Entity, ManyToOne } from "typeorm";
import { TypeAppointment } from "./type-appointment.entity";
import { Day } from "../enums";
import { ApiHideProperty, ApiProperty } from "@nestjs/swagger";

@Entity('type_appointment_availability')
export class TypeAppointmentAvailability extends Base {
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

    @Column({ type: 'time' })
    startTime: string;

    @Column({ type: 'time' })
    endTime: string;

    @ManyToOne(() => TypeAppointment, (typeAppointment) => typeAppointment.availabilities)
    @ApiHideProperty()
    typeAppointment: TypeAppointment;

    @Column({ type: 'uuid' })
    typeAppointmentId: string;
}