import { Base } from '../../common/bases/base.entity';
import { Column, Entity, JoinTable, ManyToMany } from 'typeorm';
import { Organization } from '.';
import { ApiProperty } from '@nestjs/swagger';

//Esta entidad anteiormente se denominaba Commission
@Entity('commissions')
export class FinancialTransaction extends Base {
  @Column({
    type: 'decimal',
    nullable: false
  })
  percentage: number;

  @Column({
    type: 'int',
    name: 'minimun_patients'
  })
  minimunPatients: number;

  @ManyToMany(() => Organization, (organization) => organization.commissions, {
    eager: true
  })
  @JoinTable({
    name: 'commission_organizations',
    joinColumn: {
      name: 'comission_id',
      referencedColumnName: 'id'
    },
    inverseJoinColumn: {
      name: 'organization_id',
      referencedColumnName: 'id'
    }
  })
  @ApiProperty({ type: () => [Organization] })
  organizations: Organization[];
}
