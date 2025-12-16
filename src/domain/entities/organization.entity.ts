import { Base } from '../../common/bases/base.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany
} from 'typeorm';
import { ValueAddedTax  } from './value-added-tax.entity';
import { ApiProperty } from '@nestjs/swagger';
import { OrganizationType, FinancialTransaction, Branch } from '.';

//Esta entidad anteriormente se denominaba institution
@Entity('organization')
export class Organization extends Base {
  @Column({
    type: 'varchar',
    nullable: false
  })
  @ApiProperty({ example: '30701234567' })
  cuit: string;

  @Column({
    type: 'varchar',
    nullable: false,
    name: 'business_name'
  })
  @ApiProperty({ example: 'Centro Médico' })
  businessName: string;

  @ManyToOne(() => ValueAddedTax , {
    eager: true
  })
  @JoinColumn({ name: 'iva_id' })
  @ApiProperty({ type: () => ValueAddedTax })
  iva: ValueAddedTax ;

  @ManyToOne(() => OrganizationType, {
    eager: true
  })
  @JoinColumn({ name: 'organization_type_id' })
  @ApiProperty({ type: () => OrganizationType })
  organizationType: OrganizationType;

  @ManyToMany(() => FinancialTransaction, (commission) => commission.organizations)
  @ApiProperty({ type: () => [FinancialTransaction] })
  commissions: FinancialTransaction[];

  @OneToMany(() => Branch, (branch) => branch.organization, {
    cascade: ['soft-remove', 'recover'],
    orphanedRowAction: 'soft-delete',
    eager: true
  })
  @ApiProperty({ type: () => [Branch] })
  branch: Branch[];
}
