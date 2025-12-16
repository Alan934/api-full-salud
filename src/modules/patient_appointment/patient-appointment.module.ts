import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientAppointmentController } from './patient-appointment.controller';
import { PatientAppointmentService } from './patient-appointment.service';
import { AuthModule } from '../auth/auth.module';
import { AppointmentSlot } from '../../domain/entities';

@Module({
  imports: [TypeOrmModule.forFeature([AppointmentSlot]), forwardRef(() => AuthModule)],
  controllers: [PatientAppointmentController],
  providers: [PatientAppointmentService]
})
export class PatientAppointmentModule {}
