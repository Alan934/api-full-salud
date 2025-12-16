import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import {FamilyGroup, RelatedPerson, SocialWorkEnrollment } from '.';
import { User } from './user.entity';
import { PatientPractitionerFavorite } from './patient-practitioner-favorite.entity';
import { Expose } from 'class-transformer';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';

@Entity('patient')
export class Patient extends User {

  @Column({
    type: 'varchar',
    nullable: true,
    name: 'email_tutor',
    length: 50,
  })
  @ApiProperty({ example: 'Peréz' })
  emailTutor: string;

  @Column({
    type: 'varchar',
    nullable: true,
    name: 'phone_tutor',
    length: 50,
  })
  @ApiProperty({ example: 'Peréz' })
  phoneTutor: string;

  // @Expose()
  // @ManyToOne(() => RelatedPerson, {
  //   eager: true,
  //   nullable: true,
  // })
  // @JoinColumn({ name: 'relationship_id' })
  // relationship: RelatedPerson | null;

  @Expose()
  @OneToMany(() => PatientPractitionerFavorite, (favorite) => favorite.patient)
  @ApiHideProperty()
  favorites: PatientPractitionerFavorite[]

  @Expose()
  @OneToOne(() => SocialWorkEnrollment, (enrollment) => enrollment.patient, {
    eager: true, 
    nullable: true,
    cascade: ['insert', 'update'], 
    onDelete: 'SET NULL', 
  })
  @JoinColumn({ name: 'social_work_enrollment_id' })
  @ApiProperty({ type: () => SocialWorkEnrollment })
  socialWorkEnrollment: SocialWorkEnrollment | null;

  @Column({
    type: 'uuid',
    nullable: true,
    name: 'family_group_id'
  })
  @ApiProperty({ example: '50436717-8608-4bff-bf41-373f14a8b888', description: 'UUID del grupo familiar al que pertenece el paciente', required: false })
  familyGroupId?: string;

  @Expose()
  @ManyToOne(() => FamilyGroup, (familyGroup) => familyGroup.familyMembers, {
    nullable: true,
    onDelete: 'SET NULL'
  })
  @JoinColumn({ name: 'family_group_id' })
  @ApiHideProperty()
  familyGroup?: FamilyGroup;
}
