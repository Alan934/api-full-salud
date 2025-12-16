import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Patient, Practitioner, User } from '.';
import { Base } from '../../common/bases/base.entity';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';

@Entity('notification')
export class Notification extends Base {
  @Column({
    type: 'varchar'
  })
  text: string;

  @Column({
    type: 'varchar'
  })
  title: string;

  @Column({
    type: 'boolean'
  })
  read: boolean;// leido

  // @ManyToOne(() => User, {
  //   onDelete: 'CASCADE', // Se elimina la notificacion cuando se elimina físicamente el usuario
  //   nullable: false
  // })
  // @JoinColumn({ name: 'user_id' })
  // user: User;

  @ManyToOne(() => Patient, {
    onDelete: 'CASCADE', // Se elimina la notificacion cuando se elimina físicamente el usuario

  })
  @JoinColumn({ name: 'patient_id' })
  @ApiHideProperty()
  patient?: Patient;

  @ManyToOne(() => Practitioner, {
    onDelete: 'CASCADE', // Se elimina la notificacion cuando se elimina físicamente el usuario
  })
  @JoinColumn({ name: 'practitioner_id' })
  @ApiProperty({ type: () => Practitioner })
  practitioner?: Practitioner;
}
