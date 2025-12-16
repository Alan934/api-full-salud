import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TypeAppointmentAvailabilityController } from "./type-appointment-availability.controller";
import { TypeAppointmentAvailabilityService } from "./type-appointment-availability.service";
import { AuthModule } from "../auth/auth.module";
import { TypeAppointment, TypeAppointmentAvailability } from "../../domain/entities";

@Module({
    imports: [
        TypeOrmModule.forFeature([TypeAppointmentAvailability, TypeAppointment]),
        AuthModule
    ],
    controllers: [TypeAppointmentAvailabilityController],
    providers: [TypeAppointmentAvailabilityService],
    exports: [TypeAppointmentAvailabilityService]
})
export class TypeAppointmentAvailabilityModule {}