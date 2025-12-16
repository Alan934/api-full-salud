import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '../../common/bases/base.service';
import { CreatePractitionerRoleDto, SerializerPractitionerRoleDto, UpdatePractitionerRoleDto } from '../../domain/dtos';
import { PractitionerRole } from '../../domain/entities';
import { EntityManager, Repository } from 'typeorm';
import { ErrorManager } from '../../common/exceptions/error.manager';
import { PaginationMetadata } from '../../common/util/pagination-data.util';
import { PaginationDto } from '../../common/dtos/pagination-common.dto';

@Injectable()
export class PractitionerRoleService extends BaseService<
  PractitionerRole,
  CreatePractitionerRoleDto,
  UpdatePractitionerRoleDto
> {
  constructor(
    @InjectRepository(PractitionerRole) protected practitionerRoleRepository: Repository<PractitionerRole>,
  ) {
    super(practitionerRoleRepository);
  }

  async createpractitionerRole(createpractitionerRoleDto: CreatePractitionerRoleDto): Promise<PractitionerRole> {
    try {
      const newpractitionerRole = this.practitionerRoleRepository.create(createpractitionerRoleDto);
      return await this.practitionerRoleRepository.save(newpractitionerRole);
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async getOne(id: string): Promise<PractitionerRole> {
    try {
      const practitionerRole = await this.practitionerRoleRepository.findOne({
        where: { id, deletedAt: null },
        relations: ['tags'],
      });

      if (!practitionerRole) {
        throw new NotFoundException(`practitionerRole with ID ${id} not found`);
      }

      return practitionerRole;
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async findAllPaginated(paginationDto: PaginationDto): Promise<{ data: SerializerPractitionerRoleDto[]; meta: PaginationMetadata }> {
    const { page, limit } = paginationDto;
    const [practitionerRoles, total] = await this.practitionerRoleRepository.findAndCount({
      where: { deletedAt: null },
      relations: ['tags'],
      skip: (page - 1) * limit,
      take: limit
    });

    const totalPages = Math.ceil(total / limit);
    const nextPage = page < totalPages ? page + 1 : null;
    const previousPage = page > 1 ? page - 1 : null;
    
    return {
      data: practitionerRoles as SerializerPractitionerRoleDto[],
      meta: {
        totalPages,
        currentPage: page,
        previousPage,
        nextPage,
        totalItems: total
      }
    };
  }

  async getAll(): Promise<PractitionerRole[]> {
    try {
      return await this.practitionerRoleRepository.find({
        where: { deletedAt: null },
        relations: ['tags'],
      });
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async updatepractitionerRole(id: string, updatepractitionerRoleDto: UpdatePractitionerRoleDto): Promise<PractitionerRole> {
    try {
      const practitionerRole = await this.getOne(id);

      Object.assign(practitionerRole, updatepractitionerRoleDto);
      return await this.practitionerRoleRepository.save(practitionerRole);
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async softDelete(id: string): Promise<void> {
    try {
      const practitionerRole = await this.getOne(id);
      await this.practitionerRoleRepository.softRemove(practitionerRole);
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async recoverpractitionerRole(id: string): Promise<PractitionerRole> {
    try {
      const practitionerRole = await this.practitionerRoleRepository.findOne({
        where: { id },
        withDeleted: true,
      });

      if (!practitionerRole) {
        throw new NotFoundException(`practitionerRole with ID ${id} not found or not deleted`);
      }

      await this.practitionerRoleRepository.recover(practitionerRole);
      return practitionerRole;
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async removeWithManager(id: string, manager: EntityManager) {
    try {
      const entity = await manager.findOne(PractitionerRole, {
        where: { id },
      });
      await manager.remove(PractitionerRole, entity);
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async softRemoveWithManager(id: string, manager: EntityManager) {
    try {
      const entity = await manager.findOne(PractitionerRole, {
        where: { id },
      });
      await manager.softRemove(PractitionerRole, entity);
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async restoreWithManager(id: string, manager: EntityManager): Promise<PractitionerRole> {
    try {
      const entity = await manager.findOne(PractitionerRole, {
        where: { id },
        withDeleted: true,
      });
      return await manager.recover(PractitionerRole, entity);
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }
}
