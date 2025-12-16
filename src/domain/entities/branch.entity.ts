import { Base } from '../../common/bases/base.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany
} from 'typeorm';
import { Address, AppointmentSlot , Organization, Location } from '.';
import { ApiProperty } from '@nestjs/swagger';

//Esta entidad antes se denominaba headquarters
@Entity('branch')
export class Branch extends Base {
  @Column({
    type: 'varchar',
    nullable: false
  })
  cuit: string;

  @Column({
    type: 'varchar',
    nullable: false,
    name: 'business_name'
  })
  businessName: string;

  @Column({
    type: 'varchar',
    nullable: false
  })
  phone: string;

  @ManyToOne(() => Organization, {
    onDelete: 'CASCADE',
    orphanedRowAction: 'soft-delete'
  })
  @JoinColumn({ name: 'organization_id' })
  @ApiProperty({ type: () => Organization })
  organization: Organization;

  @ManyToOne(() => Address, {
    eager: true,
    cascade: true,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'address_id' })
  @ApiProperty({ type: () => Address })
  address: Address;

  @OneToMany(
    () => AppointmentSlot ,
    (appointmentSlot) => appointmentSlot.branch,
    {
      eager: true,
      cascade: true,
      nullable: true,
      orphanedRowAction: 'soft-delete',
      onUpdate: 'CASCADE'
    }
  )
  @ApiProperty({ type: () => [AppointmentSlot] })
  appointmentSlot: AppointmentSlot [];

  @Column({
    type: 'boolean',
    nullable: false,
    default: false,
    name: 'is_main_branch'
  })
  isMainBranch: boolean;

  @OneToMany(() => Location, (location) => location.branch, {
    cascade: true, // Si se guarda la branch, se guardan sus locations
  })
  @ApiProperty({ type: () => [Location] })
  locations: Location[];
}
