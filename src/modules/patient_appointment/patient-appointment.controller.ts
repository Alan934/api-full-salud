import { Controller } from '@nestjs/common';
import { PatientAppointmentService } from './patient-appointment.service';
import { ControllerFactory } from '../../common/factories/controller.factory';
import {
  CreateAppointmentSlotDto,
  SerializerAppointmentSlotDto,
  UpdateAppointmentSlotDto,
} from '../../domain/dtos';
import { ApiTags } from '@nestjs/swagger';
import { AppointmentSlot } from '../../domain/entities';

@ApiTags('PatientAppointment')
@Controller('patient-appointment')
export class PatientAppointmentController extends ControllerFactory<
  AppointmentSlot,
  CreateAppointmentSlotDto,
  UpdateAppointmentSlotDto,
  SerializerAppointmentSlotDto
>(
  AppointmentSlot,
  CreateAppointmentSlotDto,
  UpdateAppointmentSlotDto,
  SerializerAppointmentSlotDto
) {
  constructor(protected service: PatientAppointmentService) {
    super();
  }
}
