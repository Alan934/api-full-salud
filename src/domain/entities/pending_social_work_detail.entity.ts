import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, JoinColumn } from "typeorm";
import { Practitioner } from "./practitioner.entity";
import { Base } from "../../common/bases/base.entity";
import { ApiProperty } from '@nestjs/swagger';

@Entity('pending_social_work_detail')
export class PendingSocialWorkDetail extends Base {
    
    @ManyToOne(() => Practitioner, practitioner => practitioner.pendingSocialWorkDetails, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'practitioner_id' })
    @ApiProperty({ type: () => Practitioner })
    practitioner: Practitioner;

    @Column({ type: 'uuid' })
    socialWorkId: string;

    @Column('float')
    price: number;

}