import { Inject, Injectable, Scope, NotFoundException, ConflictException } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { InjectRepository } from "@nestjs/typeorm";
import { Request } from "express";
import { Repository } from "typeorm";
import { CreateTypeAppointmentAvailabilityDto, UpdateTypeAppointmentAvailabilityDto } from "../../domain/dtos/type_appointment_availability/type-appointment-availability.dto";
import { BaseService } from "../../common/bases/base.service";
import { TypeAppointment, TypeAppointmentAvailability } from "../../domain/entities";
import { ErrorManager } from "../../common/exceptions/error.manager";
import { PaginationDto } from "../../common/dtos/pagination-common.dto";
import { PaginationMetadata, getPagingData } from "../../common/util/pagination-data.util";

@Injectable({ scope: Scope.REQUEST })
export class TypeAppointmentAvailabilityService extends BaseService<
    TypeAppointmentAvailability,
    CreateTypeAppointmentAvailabilityDto,
    UpdateTypeAppointmentAvailabilityDto
>{
    constructor(
        @InjectRepository(TypeAppointmentAvailability) 
        protected repository: Repository<TypeAppointmentAvailability>,
        @InjectRepository(TypeAppointment)
        protected typeAppointmentRepository: Repository<TypeAppointment>,
        @Inject(REQUEST) request: Request
    ) {
        super(repository/*, request*/);
    }

    async create(createDto: CreateTypeAppointmentAvailabilityDto): Promise<TypeAppointmentAvailability> {
        try {
            // Verificar que existe el tipo de cita
            const typeAppointment = await this.typeAppointmentRepository.findOne({
                where: { id: createDto.typeAppointmentId }
            });

            if (!typeAppointment) {
                throw new NotFoundException(`Type appointment with ID "${createDto.typeAppointmentId}" not found`);
            }

            // Verificar si ya existe una disponibilidad para ese día y tipo de cita
            const existingAvailability = await this.repository.findOne({
                where: {
                    typeAppointmentId: createDto.typeAppointmentId,
                    day: createDto.day
                }
            });

            if (existingAvailability) {
                throw new ConflictException(`Availability for this type appointment on ${createDto.day} already exists`);
            }

            const newAvailability = this.repository.create({
                ...createDto,
                typeAppointment
            });

            return await this.repository.save(newAvailability);
        } catch (error: any) {
            if (error instanceof NotFoundException || error instanceof ConflictException) {
                throw error;
            }
            throw ErrorManager.createSignatureError(error?.message || 'Error creating availability');
        }
    }

    async findAll(paginationDto: PaginationDto): Promise<{
        data: TypeAppointmentAvailability[];
        meta: PaginationMetadata;
    }> {
        try {
            const { page = 1, limit = 10 } = paginationDto;
            const queryBuilder = this.repository.createQueryBuilder('availability')
                .leftJoinAndSelect('availability.typeAppointment', 'typeAppointment')
                .where('availability.deletedAt IS NULL');

            const [data, total] = await queryBuilder
                .skip((page - 1) * limit)
                .take(limit)
                .getManyAndCount();

            const meta = getPagingData(data, page, limit);
            return { data, meta };
        } catch (error: any) {
            throw ErrorManager.createSignatureError('Error retrieving availabilities');
        }
    }

    async findOne(id: string): Promise<TypeAppointmentAvailability> {
        try {
            const availability = await this.repository.findOne({
                where: { id, deletedAt: null },
                relations: ['typeAppointment']
            });

            if (!availability) {
                throw new NotFoundException(`Availability with ID "${id}" not found`);
            }

            return availability;
        } catch (error: any) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw ErrorManager.createSignatureError(error?.message || 'Error retrieving availability');
        }
    }

    async findByTypeAppointment(typeAppointmentId: string): Promise<TypeAppointmentAvailability[]> {
        try {
            return await this.repository.find({
                where: { 
                    typeAppointmentId,
                    deletedAt: null
                },
                relations: ['typeAppointment']
            });
        } catch (error: any) {
            throw ErrorManager.createSignatureError('Error retrieving availabilities by type appointment');
        }
    }

    async update(id: string, updateDto: UpdateTypeAppointmentAvailabilityDto): Promise<TypeAppointmentAvailability> {
        try {
            const availability = await this.findOne(id);

            if (updateDto.typeAppointmentId && updateDto.typeAppointmentId !== availability.typeAppointmentId) {
                const typeAppointment = await this.typeAppointmentRepository.findOne({
                    where: { id: updateDto.typeAppointmentId }
                });

                if (!typeAppointment) {
                    throw new NotFoundException(`Type appointment with ID "${updateDto.typeAppointmentId}" not found`);
                }

                availability.typeAppointment = typeAppointment;
            }

            Object.assign(availability, updateDto);
            return await this.repository.save(availability);
        } catch (error: any) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw ErrorManager.createSignatureError(error?.message || 'Error updating availability');
        }
    }

    async softDelete(id: string): Promise<{ message: string }> {
        try {
            const availability = await this.findOne(id);
            await this.repository.softRemove(availability);
            return { message: `Availability with ID "${id}" has been soft deleted` };
        } catch (error: any) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw ErrorManager.createSignatureError(error?.message || 'Error deleting availability');
        }
    }
    
    async hardDelete(id: string): Promise<{ message: string }> {
        try {
            const availability = await this.findOne(id);
            await this.repository.remove(availability);
            return { message: `Availability with ID "${id}" has been hard deleted` };
        } catch (error: any) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw ErrorManager.createSignatureError(error?.message || 'Error deleting availability');
        }
    }

    async recover(id: string): Promise<TypeAppointmentAvailability> {
        try {
            const availability = await this.repository.findOne({
                where: { id },
                withDeleted: true
            });

            if (!availability) {
                throw new NotFoundException(`Availability with ID "${id}" not found`);
            }

            if (!availability.deletedAt) {
                throw new ConflictException(`Availability with ID "${id}" is not deleted`);
            }

            await this.repository.recover(availability);
            return this.findOne(id);
        } catch (error: any) {
            if (error instanceof NotFoundException || error instanceof ConflictException) {
                throw error;
            }
            throw ErrorManager.createSignatureError(error?.message || 'Error recovering availability');
        }
    }
}