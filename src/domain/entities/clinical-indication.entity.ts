import { Base } from '../../common/bases/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Prescription, ClinicalIndicationDetail } from '.';
import { ApiProperty } from '@nestjs/swagger';

//Esta entidad anteriormente se denominaba Indication
@Entity('clinical_indication')
export class ClinicalIndication extends Base {
  @Column({
    type: 'varchar',
    default: null,
    nullable: true
  })
  start: string;

  @ManyToOne(() => Prescription, (prescription) => prescription.indications, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'prescription_id' })
  @ApiProperty({ type: () => Prescription })
  prescription?: Prescription;

  @OneToMany(
    () => ClinicalIndicationDetail,
    (indicationDetail) => indicationDetail.indication,
    {
      eager: true,
      cascade: true
    }
  )
  @ApiProperty({ type: () => [ClinicalIndicationDetail] })
  indicationsDetails: ClinicalIndicationDetail[];
}
