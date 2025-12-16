import { Base } from "../../common/bases/base.entity";
import { Entity, JoinColumn, ManyToOne } from "typeorm";
import { Practitioner } from "./practitioner.entity";
import { Secretary } from "./secretary.entity";
import { Location } from "./location.entity";
import { ApiProperty } from '@nestjs/swagger';


@Entity('practitioner_secretary')
export class PractitionerSecretary extends Base {
  
 @ManyToOne(() => Practitioner, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'practitioner_id' })
  @ApiProperty({ type: () => Practitioner })
  practitioner: Practitioner;

  @ManyToOne(() => Secretary, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'secretary_id' })
  @ApiProperty({ type: () => Secretary })
  secretary: Secretary;

  @ManyToOne(() => Location,{eager: true, nullable: true})
  @JoinColumn({name : 'location_id'})
  @ApiProperty({ type: () => Location })
  location: Location;

}
