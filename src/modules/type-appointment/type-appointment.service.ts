import { Injectable, Inject, Scope, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeAppointmentAvailabilityService } from '../type_appointment_availability/type-appointment-availability.service';
import { TypeAppointmentFilterDto } from '../../domain/dtos/type-appointment/type-appointment-filter.dto';
import { ErrorManager } from '../../common/exceptions/error.manager';
import { BaseService } from '../../common/bases/base.service';
import { PaginationDto } from '../../common/dtos/pagination-common.dto';
import { PaginationMetadata, getPagingData } from '../../common/util/pagination-data.util';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { Practitioner, TypeAppointment } from '../../domain/entities';
import { CreateTypeAppointmentDto, UpdateTypeAppointmentDto } from '../../domain/dtos';

@Injectable({ scope: Scope.REQUEST })
export class TypeAppointmentService extends BaseService<
  TypeAppointment,
  CreateTypeAppointmentDto,
  UpdateTypeAppointmentDto
> {
  constructor(
    @InjectRepository(TypeAppointment)
    protected repository: Repository<TypeAppointment>,
    @InjectRepository(Practitioner)
    protected practitionerRepository: Repository<Practitioner>,
    @Inject(TypeAppointmentAvailabilityService)
    private readonly availabilityService: TypeAppointmentAvailabilityService,
    @Inject(REQUEST) request: Request
  ) {
    super(repository/*, request*/);
  }

  async create(createDto: CreateTypeAppointmentDto): Promise<TypeAppointment> {
    let practitioner = null;
    if (createDto.practitionerId) {
      practitioner = await this.practitionerRepository.findOne({
        where: { id: createDto.practitionerId },
      });
      if (!practitioner) {
        throw new NotFoundException('Practitioner not found');
      }
    }

    // Crear el TypeAppointment principal (sin incluir availabilities para evitar conflictos de tipos)
    const { availabilities, ...rest } = createDto as any;
    const newType = this.repository.create({
      name: rest.name,
      color: rest.color,
      instructions: rest.instructions,
      practitionerId: rest.practitionerId,
      practitioner,
    });
    const savedType = await this.repository.save(newType);

    // Crear las disponibilidades si vienen en el DTO
    if (availabilities && Array.isArray(availabilities)) {
      for (const availabilityDto of availabilities) {
        await this.availabilityService.create({
          day: availabilityDto.day,
          startTime: availabilityDto.startTime,
          endTime: availabilityDto.endTime,
          typeAppointmentId: savedType.id,
        });
      }
    }

    // Retornar el TypeAppointment con las disponibilidades asociadas
    return await this.repository.findOne({
      where: { id: savedType.id },
      relations: ['availabilities', 'practitioner'],
    });
  }

async findAllFiltered(filterDto: TypeAppointmentFilterDto): Promise<{
    data: TypeAppointment[];
    total: number;
    page: number;
    limit: number;
    lastPage: number;
  }> {
    try {
      const { page = 1, limit = 10, ...filters } = filterDto;
      const queryBuilder = this.repository
        .createQueryBuilder('typeAppointment')
        .leftJoinAndSelect('typeAppointment.practitioner', 'practitioner')
        .leftJoinAndSelect('typeAppointment.availabilities', 'availabilities');

      queryBuilder.where('typeAppointment.deletedAt IS NULL');

      if (filters.name) {
        queryBuilder.andWhere('typeAppointment.name ILIKE :name', { 
          name: `%${filters.name}%` 
        });
      }

      if (filters.color) {
        queryBuilder.andWhere('typeAppointment.color = :color', { 
          color: filters.color 
        });
      }

      if (filters.practitionerIds && filters.practitionerIds.length > 0) {
        queryBuilder.andWhere('typeAppointment.practitionerId IN (:...practitionerIds)', {
          practitionerIds: filters.practitionerIds,
        });
      }

      if (filters.day) {
          queryBuilder.andWhere('availabilities.day = :day OR availabilities IS NULL' , { day: filters.day });
        }


      const [data, total] = await queryBuilder
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      const lastPage = Math.ceil(total / limit);

      return {
        data,
        total,
        page,
        limit,
        lastPage
      };
    } catch (error) {
      throw ErrorManager.createSignatureError(
        'Error al obtener los tipos de cita con filtros'
      );
    }
  }

  async findAllWithFilters(
    filters: TypeAppointmentFilterDto,
    paginationDto: PaginationDto
  ): Promise<{
    data: TypeAppointment[];
    meta: PaginationMetadata;
  }> {
    const { page = 1, limit = 10 } = paginationDto;
    const queryBuilder = this.repository.createQueryBuilder('typeAppointment');

    queryBuilder.where('typeAppointment.deletedAt IS NULL');

    if (filters.name) {
      queryBuilder.andWhere('typeAppointment.name ILIKE :name', { 
        name: `%${filters.name}%` 
      });
    }

    if (filters.color) {
      queryBuilder.andWhere('typeAppointment.color = :color', { 
        color: filters.color 
      });
    }

    const [data, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const meta = getPagingData(data, page, limit);

    return { data, meta };
  }

  async getOne(id: string): Promise<TypeAppointment> {
    const type = await this.repository.findOne({
      where: { id, deletedAt: null }
    });

    if (!type) {
      throw new NotFoundException(`Appointment type with ID "${id}" not found`);
    }

    return type;
  }

  async update(id: string, updateDto: UpdateTypeAppointmentDto): Promise<TypeAppointment> {
    const type = await this.getOne(id);

    // Check for name conflicts only if name is being updated
    if (updateDto.name && updateDto.name !== type.name) {
      const existingType = await this.repository.findOne({
        where: { name: updateDto.name, deletedAt: null }
      });

      if (existingType) {
        throw new ConflictException(`Appointment type with name "${updateDto.name}" already exists`);
      }
    }


    // Handle Practitioner relation
    if (updateDto.practitionerId !== undefined) {
      if (updateDto.practitionerId === null) {
        // Si envían null, se elimina la relación
        type.practitionerId = null;
      } else {
        const practitioner = await this.practitionerRepository.findOne({
          where: { id: updateDto.practitionerId },
        });

        if (!practitioner) {
          throw new NotFoundException('Practitioner not found');
        }

        type.practitioner = practitioner;
      }
    }

    // Separar availabilities del resto de propiedades
    const { availabilities, ...restUpdate } = updateDto as any;
    
    // Actualizar solo las propiedades básicas del TypeAppointment
    Object.assign(type, restUpdate);
    const updatedType = await this.repository.save(type);

    // Manejar disponibilidades (availabilities)
    // Si se envía availabilities (incluso si es array vacío), gestionar las relaciones
    if (availabilities !== undefined && Array.isArray(availabilities)) {
      // Obtener las disponibilidades actuales
      const currentAvailabilities = await this.availabilityService.findByTypeAppointment(id);

      // IDs de las disponibilidades enviadas en el DTO
      const sentIds = availabilities
        .filter((a: any) => a.id)
        .map((a: any) => a.id);

      // Hard delete de las que NO se enviaron
      for (const current of currentAvailabilities) {
        if (!sentIds.includes(current.id)) {
          await this.availabilityService.hardDelete(current.id);
        }
      }

      // Crear o actualizar las enviadas
      for (const availabilityDto of availabilities) {
        if (availabilityDto.id) {
          // Si tiene id, actualizar la existente
          await this.availabilityService.update(
            availabilityDto.id,
            {
              day: availabilityDto.day,
              startTime: availabilityDto.startTime,
              endTime: availabilityDto.endTime,
              typeAppointmentId: updatedType.id,
            }
          );
        } else {
          // Si no tiene id, crear nueva disponibilidad
          await this.availabilityService.create({
            day: availabilityDto.day,
            startTime: availabilityDto.startTime,
            endTime: availabilityDto.endTime,
            typeAppointmentId: updatedType.id,
          });
        }
      }
    }

    // Retornar el TypeAppointment con sus relaciones
    return await this.repository.findOne({
      where: { id: updatedType.id },
      relations: ['availabilities', 'practitioner'],
    });
  }

  async softDelete(id: string): Promise<{ message: string }> {
    const type = await this.getOne(id);
    await this.repository.softRemove(type);
    return { message: `Appointment type with ID "${id}" has been soft deleted` };
  }

  async recover(id: string): Promise<TypeAppointment> {
    const type = await this.repository.findOne({
      where: { id },
      withDeleted: true
    });

    if (!type) {
      throw new NotFoundException(`Appointment type with ID "${id}" not found`);
    }

    if (!type.deletedAt) {
      throw new ConflictException(`Appointment type with ID "${id}" is not deleted`);
    }

    await this.repository.recover(type);
    return this.getOne(id);
  }
}