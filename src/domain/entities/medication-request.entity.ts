import { Base } from '../../common/bases/base.entity';
import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
} from 'typeorm';
import {
    Appointment,
    Patient,
    Practitioner,
} from '.';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';

@Entity('medication_request')
export class MedicationRequest extends Base {

    @Column({
        type: 'varchar',
        nullable: true,
        unique: true,
    })
    codRecipe: string; 

    @Column({
        type: 'date',
        nullable: true
    })
    issueDate: Date;

    @Column({
        type: 'date',
        nullable: true
    })    
    expirationDate: Date;

    @Column({
        type: 'varchar',
        nullable: true,
    })
    observations?: string;

    @Column({
        type: 'varchar',
        nullable: true,
    })
    medication: string;

    @Column({
        type: 'varchar',
        nullable: true,
    })
    presentation?: string;

    @Column({
        type: 'varchar',
        nullable: true,
    })
    dosis?: string;

    @Column({
        type: 'varchar',
        nullable: true,
    })
    duration?: string;
    
    @Column({
        type: 'varchar',
        nullable: false
    })
    diagnosis: string;

    @ManyToOne(() => Practitioner)
    @JoinColumn({ name: 'practitioner_id' })
    @ApiProperty({ type: () => Practitioner })
    practitioner: Practitioner;

    @ManyToOne(() => Patient)
    @JoinColumn({ name: 'patient_id' })
    @ApiHideProperty()
    patient: Patient; //datos del paciente

    @ManyToOne(() => Appointment, (appointment) => appointment.medicationRequests, { nullable: true })
    @JoinColumn({ name: 'appointment_id' })
    @ApiProperty({ type: () => Appointment })
    appointment?: Appointment;

}