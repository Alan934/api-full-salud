import { Module } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { Patient, Appointment, User, TypeAppointment } from '../../domain/entities';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationModule } from '../notification/notification.module';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { BullModule } from '@nestjs/bull';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment, Patient, User, TypeAppointment]),  NotificationModule, AuthModule, MailModule,
  WhatsAppModule,
  BullModule.registerQueue({
    name: 'email', //queue name
  }),
  BullModule.registerQueue({
    name: 'whatsapp', //queue name
  }),
],
  controllers: [AppointmentController],
  providers: [AppointmentService],
  exports: [AppointmentService, TypeOrmModule.forFeature([Appointment])]
})
export class AppointmentModule {}
