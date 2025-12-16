import { Base } from '../../common/bases/base.entity';
import { Column, Entity, JoinColumn, ManyToMany, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { Address, AppointmentSlot , Branch, PractitionerSecretary } from '.';
import { ApiProperty } from '@nestjs/swagger';

//Esta entidad anteriormente se denominaba office
@Entity('location')
export class Location extends Base {
  @Column({
    type: 'varchar'
  })
  @ApiProperty({
    example: 'Consultorio del Parque'
  })
  name: string;

  @Column({
    type: 'varchar',
    nullable: true
  })
  @ApiProperty({
    example: '2615623164'
  })
  phone: string;

  @OneToOne(() => Address, {
    cascade: true,
    eager: true,
    onUpdate: 'CASCADE',
    nullable: true
  })
  @JoinColumn({
    name: 'address_id'
  })
  @ApiProperty({ type: () => Address })
  address: Address;

  @OneToOne(() => PractitionerSecretary, (secretary) => secretary.location, {
    lazy: true
  })
  @ApiProperty({ type: () => PractitionerSecretary })
  secretary: Promise<PractitionerSecretary> | PractitionerSecretary;

  @OneToMany(
    () => AppointmentSlot ,
    (appointmentSlot) => appointmentSlot.location,
    {
      eager: true,
      cascade: true,
      nullable: true,
      orphanedRowAction: 'soft-delete',
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
  )
  @ApiProperty({ type: () => [AppointmentSlot] })
  appointmentSlots: AppointmentSlot [];

  @ManyToOne(() => Branch, (branch) => branch.locations, {
    onDelete: 'CASCADE', // Si se elimina la branch, se eliminan sus locations
    nullable: true,
  })
  @JoinColumn({ name: 'branch_id' })
  @ApiProperty({ type: () => Branch })
  branch: Branch;

}
