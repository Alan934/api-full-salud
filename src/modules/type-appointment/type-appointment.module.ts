import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Practitioner, TypeAppointment } from '../../domain/entities';
import { TypeAppointmentAvailabilityModule } from '../type_appointment_availability/type-appointment-availability.module';
import { TypeAppointmentController } from './type-appointment.controller';
import { TypeAppointmentService } from './type-appointment.service';
import { AuthModule } from '../auth/auth.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([TypeAppointment, Practitioner]),
    AuthModule,
    TypeAppointmentAvailabilityModule
  ],
  controllers: [TypeAppointmentController],
  providers: [TypeAppointmentService],
  exports: [TypeAppointmentService]
})
export class TypeAppointmentModule {}