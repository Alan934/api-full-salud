import { forwardRef, Module } from '@nestjs/common';
import { AppointmentSlotService } from './appointment-slot.service';
import { AppointmentSlotController } from './appointment-slot.controller';
import { AppointmentSlot, AppointmentSlotSchedule, Practitioner  } from '../../domain/entities';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { PractitionerModule } from '../practitioner/practitioner.module';

@Module({
  imports: [TypeOrmModule.forFeature([AppointmentSlot, AppointmentSlotSchedule, Practitioner ]), forwardRef(() => AuthModule), PractitionerModule],
  controllers: [AppointmentSlotController],
  providers: [AppointmentSlotService]
})
export class AppointmentSlotModule {}
