import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, JoinColumn } from 'typeorm';
import { Practitioner } from './practitioner.entity';
import { SocialWork } from './social-work.entity';
import { Base } from '../../common/bases/base.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('practitioner_social_work')
export class PractitionerSocialWork extends Base {

  @ManyToOne(() => Practitioner, practitioner => practitioner.practitionerSocialWorks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'practitioner_id' })
  @ApiProperty({ type: () => Practitioner })
  practitioner: Practitioner;

  @ManyToOne(() => SocialWork, socialWork => socialWork.practitionerSocialWorks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'social_work_id' })
  @ApiProperty({ type: () => SocialWork })
  socialWork: SocialWork;

  @Column({ type: 'uuid' })
  practitionerId: string;

  @Column({ type: 'uuid' })
  socialWorkId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  price: number;
}