import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '../../common/bases/base.service';
import { ErrorManager } from '../../common/exceptions/error.manager';
import {
  Conditions,
  DynamicQueryBuilder
} from '../../common/util/dynamic-query-builder.util';
import {
  getPagingData,
  PaginationMetadata
} from '../../common/util/pagination-data.util';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationPaginationDto
} from '../../domain/dtos';
import { Organization, Appointment } from '../../domain/entities';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { BranchService } from '../branch/branch.service';

@Injectable()
export class OrganizationService extends BaseService<
  Organization,
  CreateOrganizationDto,
  UpdateOrganizationDto
> {
  constructor(
    @InjectRepository(Organization)
    protected repository: Repository<Organization>,
    @Inject() protected readonly branchService: BranchService
  ) {
    super(repository);
  }

  //condiciones que se agregarán al query builder para filtrar organizations
  private organizationsConditions: Conditions<Organization> = {
    cuit: (queryBuilder: SelectQueryBuilder<Organization>, value: string) =>
      queryBuilder.andWhere('organization.cuit = :cuit', { cuit: value }),
    businessName: (
      queryBuilder: SelectQueryBuilder<Organization>,
      value: string
    ) =>
      queryBuilder.andWhere('organization.business_name LIKE :businessName', {
        businessName: `%${value}%`
      }),
    organizationType: (
      queryBuilder: SelectQueryBuilder<Organization>,
      value: string
    ) =>
      queryBuilder.andWhere(
        'organization.organization_type_id = :organizationType',
        { organizationType: value }
      ),
    iva: (queryBuilder: SelectQueryBuilder<Organization>, value: string) =>
      queryBuilder.andWhere('organization.iva_id = :iva', { iva: value })
    /* day: (queryBuilder: SelectQueryBuilder<organization>, value: Day) => queryBuilder.andWhere('attention_hours.day = :day', { day: value }),*/
  };

  async create(createDto: CreateOrganizationDto): Promise<Organization> {
    try {
      const organization = this.repository.create(createDto);
      return await this.repository.save(organization);
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  //override del método base findAll para agregar el filtrado por propiedades
  override async findAll(
    paginationDto: OrganizationPaginationDto
  ): Promise<{ data: Organization[]; meta: PaginationMetadata }> {
    try {
      const { page, limit } = paginationDto;

      const queryBuilderBase = this.repository
        .createQueryBuilder('organization')
        /* .innerJoinAndSelect('organization.appointmentSlot', 'attention_hours') */
        .innerJoinAndSelect('organization.organizationType', 'organization_type');
      const query = DynamicQueryBuilder.buildSelectQuery<Organization>(
        queryBuilderBase,
        this.organizationsConditions,
        paginationDto
      );

      /* if(paginationDto.fromHour && paginationDto.toHour) {  //añade filtrado por rango de horario
        query.andWhere(//fromHour => open AND fromHour < close
          '((attention_hours.opening_hour <= :fromHour ' + 
          'AND attention_hours.close_hour > :fromHour) ' +
          ' OR ' +
          '(attention_hours.opening_hour < :toHour ' + 
          'AND attention_hours.close_hour >= :toHour))', 
          { fromHour: paginationDto.fromHour, toHour: paginationDto.toHour })
      } else if (paginationDto.fromHour && !paginationDto.toHour) { //añade filtrado por hora fija
        query.andWhere(
          '(attention_hours.opening_hour <= :fromHour ' + 
          'AND attention_hours.close_hour > :fromHour)', { fromHour: paginationDto.fromHour })
      }
 */
      query.skip((page - 1) * limit).take(limit);

      const entities = await query.getMany();
      return {
        data: entities,
        meta: getPagingData(entities, page, limit)
      };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async getOne(id: string): Promise<Organization> {
    try {
      const organization = await this.repository.findOne({
        where: { id },
        relations: [
          'iva', 
          'organizationType', 
          'commissions', 
          'branch', 
          'branch.address', 
          'branch.appointmentSlot', 
          'branch.locations'
        ],
      });
  
      if (!organization) {
        throw new NotFoundException(`Organization with ID ${id} not found`);
      }
  
      return organization;
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  override async remove(id: string): Promise<string> {
    try {
      const entity = await this.findOne(id);
      return this.repository.manager.transaction(
        async (manager: EntityManager) => {
          await manager //eliminar la institucion de turno
            .createQueryBuilder()
            .update(Appointment)
            .set({ organization: null })
            .where('organization_id = :id', { id: entity.id })
            .execute();
          await manager.remove(Organization, entity);
          return `Entity with id ${id} deleted`;
        }
      );
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  override async softRemove(id: string): Promise<string> {
    try {
      const entity = await this.findOne(id);
      return this.repository.manager.transaction(
        async (manager: EntityManager) => {

          await manager.softRemove(Organization, entity);
          return `Entity with id ${id} soft deleted`;
        }
      );
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async update(id: string, updateDto: UpdateOrganizationDto): Promise<Organization> {
    try {
      const organization = await this.getOne(id);
      Object.assign(organization, updateDto);
      return await this.repository.save(organization);
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  override async restore(id: string): Promise<Organization> {
    try {
      // Busca la entidad por su id donde  el campo deletedAt sea diferente a null
      const entity = await this.repository.findOne({
        where: { id },
        withDeleted: true
      });

      // Si 'entity' es null, devuelve una excepción como que la entidad no existe o no ha sido eliminada anteriormente
      if (!entity) {
        throw new ErrorManager(`Entity with id ${id} not found`, 404);
      }

      return this.repository.manager.transaction(
        async (manager: EntityManager) => {

          return await manager.recover(entity);
        }
      );
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }
}
