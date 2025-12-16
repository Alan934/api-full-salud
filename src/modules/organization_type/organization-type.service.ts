import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '../../common/bases/base.service';
import {
  CreateOrganizationTypeDto,
  UpdateOrganizationTypeDto
} from '../../domain/dtos';
import { OrganizationType } from '../../domain/entities';
import { Repository } from 'typeorm';
import { ErrorManager } from '../../common/exceptions/error.manager';
import { OrganizationTypeFilteredPaginationDto } from '../../domain/dtos/organization-type/organization-type-filtered-pagination.dto';

@Injectable()
export class OrganizationTypeService extends BaseService<
  OrganizationType,
  CreateOrganizationTypeDto,
  UpdateOrganizationTypeDto
> {
  constructor(
    @InjectRepository(OrganizationType)
    protected repository: Repository<OrganizationType>
  ) {
    super(repository);
  }

  async create(createDto: CreateOrganizationTypeDto): Promise<OrganizationType> {
    try {
      const entity = this.repository.create(createDto);
      return this.repository.save(entity);

    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async findAllPaginated(
    filterDto: OrganizationTypeFilteredPaginationDto,
  ): Promise<{ data: OrganizationType[]; lastPage: number; total: number; msg?: string }> {
    try {
      const { page = 1, limit = 10, type } = filterDto;

      const queryBuilder = this.repository
        .createQueryBuilder('organizationType')
        .where('organizationType.deletedAt IS NULL');

      if (type) {
        queryBuilder.andWhere('organizationType.type ILIKE :type', {
          type: `%${type}%`,
        });
      }
      queryBuilder.skip((page - 1) * limit).take(limit);

      const [data, total] = await queryBuilder.getManyAndCount();
      const lastPage = Math.ceil(total / limit);
      const msg = total === 0 ? 'No OrganizationType found matching the criteria' : undefined;

      return { data, total, lastPage, msg };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }
  async getOne(id: string): Promise<OrganizationType> {
    try {
      const orgType = await this.repository.findOne({ where: { id } });

      if (!orgType) {
        throw new NotFoundException(`OrganizationType with ID ${id} not found or softDeleted`);
      }
      return orgType;
    } catch (error) {
      throw error instanceof NotFoundException ? error : new NotFoundException('Error fetching Organization Type');
    }
  }

  async update(id: string, updateDto: UpdateOrganizationTypeDto): Promise<OrganizationType> {
    try {
      const orgType = await this.getOne(id);
      Object.assign(orgType, updateDto);
      return await this.repository.save(orgType);
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async softDeleted(id: string): Promise<{ message: string }> {
    try {
      const orgType = await this.getOne(id);

      if (orgType.deletedAt) {
        return { message: `Organization Type with ID "${id}" is already soft deleted` };
      }

      await this.repository.softRemove(orgType);
      return { message: `Organization Type with ID "${id}" soft deleted successfully` };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async recover(id: string): Promise<OrganizationType> {
    try {
      const orgType = await this.repository.findOne({
        where: { id },
        withDeleted: true
      });

      if (!orgType) throw new ErrorManager(`Organization Type with ID "${id}" not found`, 404);
      if (!orgType.deletedAt) throw new ErrorManager(`Organization Type with ID "${id}" is not soft-deleted`, 400);

      await this.repository.recover(orgType);
      return await this.repository.findOne({ where: { id } });
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }
}