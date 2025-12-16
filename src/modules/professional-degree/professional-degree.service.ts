import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '../../common/bases/base.service';
import { 
  CreateProfessionalDegreeDto,
  UpdateProfessionalDegreeDto,
  ProfessionalDegreeFilteredPaginationDto
} from '../../domain/dtos';
import { ProfessionalDegree } from '../../domain/entities';
import { Repository, FindOptionsWhere } from 'typeorm';
import { ErrorManager } from '../../common/exceptions/error.manager';

@Injectable()
export class ProfessionalDegreeService extends BaseService<
  ProfessionalDegree,
  CreateProfessionalDegreeDto,
  UpdateProfessionalDegreeDto
> {
  constructor(
    @InjectRepository(ProfessionalDegree)
    protected repository: Repository<ProfessionalDegree>
  ) {
    super(repository);
  }

  async create(createDto: CreateProfessionalDegreeDto): Promise<ProfessionalDegree> {
    try {
      const existingDegree = await this.repository.findOne({
        where: { professionalDegree: createDto.professionalDegree }
      });

      if (existingDegree) {
        throw new ErrorManager(
          `Professional degree "${createDto.professionalDegree}" already exists`,
          400
        );
      }

      const newDegree = this.repository.create(createDto);
      return await this.repository.save(newDegree);

    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async findAllPaginated(
    filterPaginationDto: ProfessionalDegreeFilteredPaginationDto,
  ): Promise<{ data: ProfessionalDegree[]; lastPage: number; total: number; msg?: string }> {
    try {
      const { page, limit, ...filters } = filterPaginationDto;

      const queryBuilder = this.repository
        .createQueryBuilder('professionalDegree')
        .where('professionalDegree.deletedAt IS NULL');

      // Apply filters dynamically
      if (filters.professionalDegree) {
        queryBuilder.andWhere('professionalDegree.professionalDegree LIKE :professionalDegree', { 
          professionalDegree: `%${filters.professionalDegree}%` 
        });
      }

      queryBuilder.orderBy('professionalDegree.professionalDegree', 'ASC')
                  .skip((page - 1) * limit)
                  .take(limit);

      const [degrees, total] = await queryBuilder.getManyAndCount();

      const lastPage = Math.ceil(total / limit);
      let msg = '';
      if (total === 0) msg = 'No professional degrees found matching the criteria';

      return { data: degrees, lastPage, total, msg };

    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async getOne(id: string): Promise<ProfessionalDegree> {
    try {
      const degree = await this.repository.findOne({
        where: { id, deletedAt: null }
      });

      if (!degree) {
        throw new NotFoundException(`Professional degree with ID ${id} not found`);
      }

      return degree;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Error fetching professional degree');
    }
  }

  async getByProfessionalDegree(name: string): Promise<ProfessionalDegree[]> {
    try {
      const degrees = await this.repository.find({
        where: { 
          professionalDegree: name,
          deletedAt: null 
        },
        order: { professionalDegree: 'ASC' }
      });

      if (!degrees || degrees.length === 0) {
        throw new NotFoundException(`No professional degrees found with name ${name}`);
      }

      return degrees;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Error fetching professional degrees');
    }
  }

  async getAllUsedByPractitioners(): Promise<ProfessionalDegree[]> {
      try {
          const degrees = await this.repository
          .createQueryBuilder('degree')
          .innerJoin('practitioner', 'p', 'p.professional_degree_id = degree.id')
          .where('degree.deletedAt IS NULL')
          .andWhere('p.deletedAt IS NULL')
          .groupBy('degree.id')
          .orderBy('degree.professionalDegree', 'ASC')
          .getMany();
  
          return degrees ?? [];
      } catch (error) {
          throw ErrorManager.createSignatureError((error as Error).message);
      }
    }

  async update(id: string, updateDto: UpdateProfessionalDegreeDto): Promise<ProfessionalDegree> {
    try {
      const existingDegree = await this.getOne(id);

      // Check if new name already exists
      if (updateDto.professionalDegree && updateDto.professionalDegree !== existingDegree.professionalDegree) {
        const existingWithNewName = await this.repository.findOne({
          where: { professionalDegree: updateDto.professionalDegree }
        });

        if (existingWithNewName) {
          throw new ErrorManager(
            `Professional degree "${updateDto.professionalDegree}" already exists`,
            400
          );
        }
      }

      Object.assign(existingDegree, updateDto);
      return await this.repository.save(existingDegree);

    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async softDelete(id: string): Promise<{ message: string }> {
    try {
      const degree = await this.getOne(id);
      await this.repository.softRemove(degree);
      return { message: `Professional degree with ID "${id}" soft deleted successfully` };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async recover(id: string): Promise<ProfessionalDegree> {
    try {
      const degree = await this.repository.findOne({
        where: { id },
        withDeleted: true
      });

      if (!degree) {
        throw new ErrorManager(`Professional degree with ID "${id}" not found`, 404);
      }

      if (!degree.deletedAt) {
        throw new ErrorManager(`Professional degree with ID "${id}" is not soft-deleted`, 400);
      }

      await this.repository.recover(degree);
      return await this.repository.findOne({ where: { id } });

    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }
}