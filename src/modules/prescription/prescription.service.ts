import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '../../common/bases/base.service';
import { ErrorManager } from '../../common/exceptions/error.manager';
import { CreatePrescriptionDto, UpdatePrescriptionDto } from '../../domain/dtos';
import { Prescription, Practitioner } from '../../domain/entities';
import { EntityManager, Repository } from 'typeorm';
import { PrescriptionFilteredPaginationDto } from '../../domain/dtos/prescription/prescriptionFilteredPaginationDto';

@Injectable()
export class PrescriptionService extends BaseService<
  Prescription,
  CreatePrescriptionDto,
  UpdatePrescriptionDto
> {
  constructor(
    @InjectRepository(Prescription)
    protected repository: Repository<Prescription>,
  ) {
    super(repository);
  }

  //sobrescribe el método base create para añadir validación si el especialista puede prescribir
  override async create(
    createDto: CreatePrescriptionDto
  ): Promise<Prescription> {
    try {
      return await this.repository.manager.transaction(
        async (entityManager: EntityManager) => {
          const specialist: Practitioner = await entityManager.findOne(Practitioner, {
            where: { id: createDto.practitioner.id },
            relations: ['practitionerRole'], // Asegúrate de incluir la relación
          });

          if (!specialist || !specialist.practitionerRole || specialist.practitionerRole.length === 0) {
            throw new ErrorManager(
              'Specialist does not have any practitionerRole assigned',
              HttpStatus.BAD_REQUEST
            );
          }

          if (specialist.practitionerRole.some((practitionerRole) => practitionerRole.canPrescribe)) {
            if (!createDto.indications && !createDto.observations) {
              throw new ErrorManager(
                'Either indications field or observations field must not be empty',
                HttpStatus.BAD_REQUEST
              );
            }
          } else {
            if (createDto.indications) {
              throw new ErrorManager(
                'Specialist is not authorized to prescribe medicine',
                HttpStatus.BAD_REQUEST
              );
            } else if (!createDto.observations) {
              throw new ErrorManager(
                'Observations field must not be empty',
                HttpStatus.BAD_REQUEST
              );
            }
          }

          const newPrescription = entityManager.create(Prescription, createDto);
          return await entityManager.save(newPrescription);
        }
      );
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async findAllPaginated(
    filterDto: PrescriptionFilteredPaginationDto,
  ): Promise<{ data: Prescription[]; total: number; lastPage: number; msg?: string }> {
    try {
      const { page = 1, limit = 10, patientId, practitionerId, date } = filterDto;

      const query = this.repository.createQueryBuilder('prescription')
        .leftJoinAndSelect('prescription.patient', 'patient')
        .leftJoinAndSelect('prescription.practitioner', 'practitioner')
        .leftJoinAndSelect('prescription.indications', 'indications');

      if (patientId) {
        query.andWhere('patient.id = :patientId', { patientId });
      }

      if (practitionerId) {
        query.andWhere('practitioner.id = :practitionerId', { practitionerId });
      }

      if (date) {
        query.andWhere('prescription.date = :date', { date });
      }

      const [data, total] = await query
        .take(limit)
        .skip((page - 1) * limit)
        .orderBy('prescription.date', 'DESC')
        .getManyAndCount();

      const lastPage = Math.ceil(total / limit);

      return { data, total, lastPage };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }


  async getOne(id: string): Promise<Prescription> {
    try {
      const prescriptionFound = await this.repository.findOne({ where: { id } });

      if (!prescriptionFound) throw new NotFoundException(`Prescription with ID ${id} not found`);

      return prescriptionFound;
    } catch (error) {
      throw error instanceof NotFoundException ? error : new NotFoundException('Error fetching Prescription');
    }
  }

  async update(id: string, updateDto: UpdatePrescriptionDto): Promise<Prescription> {
    try {
      const prescriptionFound = await this.repository.preload({ id, ...updateDto });
      if (!prescriptionFound) throw new NotFoundException(`prescription with ID ${id} not found`);
      return await this.repository.save(prescriptionFound);
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async softDeleted(id: string): Promise<{ message: string }> {
    try {
      const prescriptionFound = await this.getOne(id);

      if (prescriptionFound.deletedAt) {
        return { message: `Prescription with ID "${id}" is already soft deleted` };
      }

      await this.repository.softRemove(prescriptionFound);
      return { message: `Prescription with ID "${id}" soft deleted successfully` };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async recover(id: string): Promise<Prescription> {
    try {
      const prescriptionFound = await this.repository.findOne({ where: { id }, withDeleted: true, });

      if (!prescriptionFound) throw new ErrorManager(`Prescription with ID "${id}" not found`, 404);
      if (!prescriptionFound.deletedAt) throw new ErrorManager(`Prescription with ID "${id}" is not soft-deleted`, 400);

      await this.repository.recover(prescriptionFound);

      return await this.repository.findOne({ where: { id } });

    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

}
