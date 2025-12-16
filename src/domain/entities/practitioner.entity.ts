import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import {
  ProfessionalDegree,
  Location,
  PractitionerRole,
  SocialWork,
  AppointmentSlot,
  TypeAppointment
} from '.';
import { modePractitioner } from '../enums/mode-practitioner.enum';
import { User } from './user.entity';
import { PatientPractitionerFavorite } from './patient-practitioner-favorite.entity';
import { IsOptional } from 'class-validator';
import { PractitionerSocialWork } from './practitioner-social-work.entity';
import { PendingSocialWorkDetail } from './pending_social_work_detail.entity';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';

@Entity('practitioner')
export class Practitioner extends User {
  @Column({
    type: 'varchar',
    nullable: true,
  })
  license: string;

  @Column({
    type: 'float',
    default: 0.0,
  })
  rating: number = 0;

  @Column({
    type: 'boolean',
    nullable: true,
    name: 'home_service',
    default: false,
  })
  homeService: boolean;

  @Column({
    type: 'float',
    default: 30,
  })
  durationAppointment: number = 30;

  @Column({
    type: 'boolean',
    nullable: true,
    name: 'accepted_social_works',
    default: false,
  })
  acceptedSocialWorks: boolean;

  @Column({
    type: 'enum',
    enum: modePractitioner,
    default: modePractitioner.INPERSON,
    name: 'mode_practitioner'
  })
  @ApiHideProperty()

  @ManyToOne(() => ProfessionalDegree, {
    eager: true,
  })
  @JoinColumn({ name: 'professional_degree_id' })
  @ApiProperty({ type: () => ProfessionalDegree })
  professionalDegree: ProfessionalDegree;

  @ManyToMany(() => PractitionerRole, (practitioner) => practitioner.practitioners, {
    eager: true,
    nullable: true,
  })
  @JoinTable({
    name: 'practitioners_practitionerRole',
    joinColumn: {
      name: 'practitioner_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'practitionerRole_id',
      referencedColumnName: 'id',
    },
  })
  @ApiProperty({ type: () => [PractitionerRole] })
  practitionerRole: PractitionerRole[];

  @OneToMany(
    () => AppointmentSlot,
    (appointmentSlot) => appointmentSlot.practitioner,
    {
      eager: true,
      cascade: true,
      nullable: true,
      orphanedRowAction: 'soft-delete',
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    }
  )
  @ApiProperty({ type: () => [AppointmentSlot] })
  appointmentSlots: AppointmentSlot[];

  @Column({
    type: 'time',
    nullable: true,
  })
  consultationTime: string;

  @Column({ nullable: true })
  mpUserId: string;

  @Column({ nullable: true })
  mpAccessToken: string;

  @Column({ nullable: true })
  mpRefreshToken: string;

  @Column({ nullable: true })
  mpScope: string;


  @OneToMany(() => PatientPractitionerFavorite, (favorite) => favorite.practitioner)
  @ApiHideProperty()
  favorites: PatientPractitionerFavorite[];

  @OneToMany(() => PractitionerSocialWork, psw => psw.practitioner, { cascade: true })
  @ApiProperty({ type: () => [PractitionerSocialWork] })
  practitionerSocialWorks: PractitionerSocialWork[];

  @OneToMany(() => PendingSocialWorkDetail, pswd => pswd.practitioner, { cascade: true })
  @ApiProperty({ type: () => [PendingSocialWorkDetail] })
  pendingSocialWorkDetails: PendingSocialWorkDetail[];

  @OneToMany(() => TypeAppointment, (typeAppointment) => typeAppointment.practitioner)
  @ApiProperty({ type: () => [TypeAppointment] })
  typeAppointments: TypeAppointment[];
}
