import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '../../common/bases/base.service';
import { CreateClinicalIndicationDto, UpdateClinicalIndicationDto } from '../../domain/dtos';
import { ClinicalIndication, ClinicalIndicationDetail } from '../../domain/entities';
import { Repository } from 'typeorm';
import { clinicalIndicationFilteredPaganited } from '../../domain/dtos/clinical-indication/clinical-indication-filtered-pagination.dtp';
import { PrescriptionService } from '../prescription/prescription.service';
import { ErrorManager } from '../../common/exceptions/error.manager';

@Injectable()
export class ClinicalIndicationService {
  constructor(
    @InjectRepository(ClinicalIndication)
    private readonly clinicalIndicationRepository: Repository<ClinicalIndication>,
    @InjectRepository(ClinicalIndicationDetail) // Inyectar el repositorio de ClinicalIndicationDetail
    private readonly clinicalIndicationDetailRepository: Repository<ClinicalIndicationDetail>,
   // @Inject(forwardRef(() => PrescriptionService))
    private readonly prescriptionService: PrescriptionService, // Inyecta el servicio de Prescription
  ) {}

  async create(createClinicalIndicationDto: CreateClinicalIndicationDto): Promise<ClinicalIndication>{
    //const {start, indicationsDetails}= createClinicalIndicationDto

    const clinical_indication = this.clinicalIndicationRepository.save(createClinicalIndicationDto)
    return clinical_indication
  }
  

  async getAll(paginationDto: clinicalIndicationFilteredPaganited)
  :Promise<{data: ClinicalIndication[], lastPage: number, total: number, msg?: string}>{
    const { page, limit, ...filters } = paginationDto;
    const queryBuilder = this.clinicalIndicationRepository
      .createQueryBuilder('clinical_indication')
      .leftJoinAndSelect('clinical_indication.prescription', 'prescription')
      .leftJoinAndSelect('clinical_indication.indicationsDetails', 'indicationsDetails')
      .where('clinical_indication.deletedAt IS NULL')

    if(filters.start !== undefined){
      queryBuilder.andWhere('clinical_indication.start =  :start', {start: filters.start})
    }

    queryBuilder.orderBy('clinical_indication.createdAt', 'ASC')
    queryBuilder.skip((page-1) * limit).take(limit)

    const [data, total] = await queryBuilder.getManyAndCount();
    const lastPage = Math.ceil(total / limit);
    const msg = total === 0 ? 'No se encontraron resultados para el criterio' : undefined;
    
    return { data, lastPage, total, msg };

  }

  async getOne(id: string): Promise<ClinicalIndication> {
    try {
      const clinicalIndication = await this.clinicalIndicationRepository.findOne({
        where: { id },
        relations: ['prescription', 'indicationsDetails']
      });
      if (!clinicalIndication) {
        throw new Error(`Clinical Indication with ID ${id} not found`);
      }
  
      return clinicalIndication;
    } catch (error) {
      if(error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`Clinical  Indication with ID ${id} not found`);
    }
  }

  async update(id: string, updateDto: UpdateClinicalIndicationDto): Promise<ClinicalIndication>{
    try {
      const {prescriptiondId, indicationsDetails, ...data} = updateDto
      const existingClinicalIndication = await this.clinicalIndicationRepository.findOne({ where: { id } });
      if(!existingClinicalIndication) {
        throw new NotFoundException(`Clinical Indication with ID ${id} not found`);
      }

      if(prescriptiondId){
          const prescription = await this.prescriptionService.findOne( prescriptiondId)
        if(!prescription){
          throw new NotFoundException(`Prescription with ID ${prescriptiondId} not found`);
        }
        existingClinicalIndication.prescription = prescription;
      }

      // 3. Manejar la actualización de los detalles de la indicación (ClinicalIndicationDetail)
      // Estrategia: Si indicationsDetails se proporciona, se reemplazan todos los existentes.
      if (indicationsDetails !== undefined) {
        // Eliminar los detalles existentes primero.
        // La relación ManyToOne en ClinicalIndicationDetail tiene onDelete: 'CASCADE',
        // pero para una actualización que reemplaza children, es más seguro
        // eliminar explícitamente los detalles viejos.
        if (existingClinicalIndication.indicationsDetails.length > 0) {
          await this.clinicalIndicationDetailRepository.remove(
            existingClinicalIndication.indicationsDetails,
          );
        }

        // Crear nuevas instancias de ClinicalIndicationDetail para los detalles proporcionados en el DTO.
        const newDetails: ClinicalIndicationDetail[] = [];
        for (const detailDto of indicationsDetails) {
          // Usamos `create` del repositorio del detalle para asegurarnos de que
          // TypeORM cree una instancia de entidad correctamente.
          // Si tu DTO de detalle no tiene un 'id', TypeORM lo tratará como una nueva entidad.
          const newDetail =
            this.clinicalIndicationDetailRepository.create(detailDto);
          newDetails.push(newDetail);
        }
        // Asignar la nueva lista de detalles a la entidad padre.
        // Debido a `cascade: true` en la relación OneToMany, TypeORM insertará estos nuevos detalles.
        existingClinicalIndication.indicationsDetails = newDetails;
      } else {
          // Si indicationsDetails es `undefined` (no se envió en el DTO), no hacemos nada
          // con los detalles existentes, manteniendo la lista actual.
          // Si se envía un array vacío `[]`, la lógica de arriba eliminará todos los detalles.
      }

      Object.assign(existingClinicalIndication, data);
      return await this.clinicalIndicationRepository.save(existingClinicalIndication);
    
    } catch (error) {
      if(error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`Clinical Indication with ID ${id} not found`); 
    }
  }

  async softDeleted(id: string): Promise<{ message: string }> {
    try {
      const clinicalIndication = await this.getOne(id);
      await this.clinicalIndicationRepository.softDelete(clinicalIndication.id);
      return { message: 'Clinical Indication deleted successfully' };
    } catch (error) {
      throw new NotFoundException(`Clinical Indication with ID ${id} not found`);
    }
  }

  async restore(id: string): Promise<ClinicalIndication> {
    try {
      const clinicalIndication = await this.clinicalIndicationRepository.findOne({
        where: { id },
        withDeleted: true,
        //relations: ['prescription', 'indicationsDetails']
        });
      if (!clinicalIndication) {
        throw new NotFoundException(`Clinical Indication with ID ${id} not found`);
      }
      if(!clinicalIndication.deletedAt){
        throw new ErrorManager(`Clinical Indication with ID ${id} is not soft-deleted`, 400); 
      }
      //const updateResult = await this.clinicalIndicationRepository.restore(clinicalIndication);

      //otro modo de restaurar, lo de arriba no funciona, getOne no encuentra clinical indication con id dado
      const updateResult = await this.clinicalIndicationRepository.update(id, { deletedAt: null });
      if (updateResult.affected === 0) {
        // Esto podría ocurrir si el ID no existe o si la actualización no tuvo efecto
        // (ej. ya estaba null, pero lo verificamos antes)
        throw new Error(`Failed to restore clinical indication with ID "${id}".`);
    } 
      return await this.clinicalIndicationRepository.findOne({
        where: { id },
        relations: ['prescription', 'indicationsDetails']
      });
    } catch (error) {
      throw new NotFoundException(`Clinical Indication with ID ${id} not found cacth error, error: ${error}`);
    }
  }

}
