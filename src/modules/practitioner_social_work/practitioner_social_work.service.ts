import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Practitioner, PractitionerSocialWork, SocialWork } from '../../domain/entities';
import { Repository, FindOptionsWhere, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { ErrorManager } from '../../common/exceptions/error.manager';
import { CreatePractitionerSocialWorkDto, UpdatePractitionerSocialWorkDto, PractitionerSocialWorkFilteredPaginationDto } from '../../domain/dtos';

@Injectable()
export class PractitionerSocialWorkService {
  constructor(
    @InjectRepository(PractitionerSocialWork)
    protected repository: Repository<PractitionerSocialWork>,
    @InjectRepository(Practitioner)
    private readonly practitionerRepository: Repository<Practitioner>,
    @InjectRepository(SocialWork)
    private readonly socialWorkRepository: Repository<SocialWork>,
  ) {}

  async create(createDto: CreatePractitionerSocialWorkDto): Promise<PractitionerSocialWork> {
    try {
      const { practitionerId, socialWorkId, price } = createDto;

      const practitioner = await this.practitionerRepository.findOneBy({ id: practitionerId });
      if (!practitioner) {
        throw new NotFoundException(`Practitioner with ID "${practitionerId}" not found.`);
      }

      const socialWork = await this.socialWorkRepository.findOneBy({ id: socialWorkId });
      if (!socialWork) {
        throw new NotFoundException(`SocialWork with ID "${socialWorkId}" not found.`);
      }

      const existingEntry = await this.repository.findOneBy({ practitionerId, socialWorkId, deletedAt: null });
      if (existingEntry) {
        throw new ConflictException(`Entry for Practitioner ID "${practitionerId}" and SocialWork ID "${socialWorkId}" already exists.`);
      }

      const newEntry = this.repository.create({
        practitionerId,
        socialWorkId,
        practitioner,
        socialWork,
        price,
      });

      return await this.repository.save(newEntry);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) throw error;
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async findAllPaginated(
    filterDto: PractitionerSocialWorkFilteredPaginationDto,
  ): Promise<{ data: PractitionerSocialWork[]; total: number; page: number; limit: number; lastPage: number; }> {
    try {
      const { page = 1, limit = 10, practitionerId, socialWorkId, minPrice, maxPrice } = filterDto;

      const where: FindOptionsWhere<PractitionerSocialWork> | FindOptionsWhere<PractitionerSocialWork>[] = { deletedAt: null };

      if (practitionerId) {
        where.practitionerId = practitionerId;
      }
      if (socialWorkId) {
        where.socialWorkId = socialWorkId;
      }
      if (minPrice !== undefined && maxPrice !== undefined) {
        where.price = Between(minPrice, maxPrice);
      } else if (minPrice !== undefined) {
        where.price = MoreThanOrEqual(minPrice);
      } else if (maxPrice !== undefined) {
        where.price = LessThanOrEqual(maxPrice);
      }
      
      const [data, total] = await this.repository.findAndCount({
        where,
        relations: ['practitioner', 'socialWork'],
        skip: (page - 1) * limit,
        take: limit,
        order: { createdAt: 'DESC' }
      });

      const lastPage = Math.ceil(total / limit);
      return { data, total, page, limit, lastPage };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async getOne(id: string): Promise<PractitionerSocialWork> {
    try {
      const entry = await this.repository.findOne({
        where: { id, deletedAt: null },
        relations: ['practitioner', 'socialWork'],
      });
      if (!entry) {
        throw new NotFoundException(`PractitionerSocialWork entry with ID "${id}" not found.`);
      }
      return entry;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async update(id: string, updateDto: UpdatePractitionerSocialWorkDto): Promise<PractitionerSocialWork> {
    try {
      const entry = await this.getOne(id);

      if (updateDto.price !== undefined) {
        entry.price = updateDto.price;
      }
      // No permitir cambio de practitionerId o socialWorkId, se debe borrar y crear nuevo.

      return await this.repository.save(entry);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async softDelete(id: string): Promise<{ message: string }> {
    try {
      const entry = await this.getOne(id);
      await this.repository.softRemove(entry);
      return { message: `PractitionerSocialWork entry with ID "${id}" soft deleted successfully.` };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async recover(id: string): Promise<PractitionerSocialWork> {
    try {
      const entry = await this.repository.findOne({
        where: { id },
        withDeleted: true,
      });
      if (!entry) {
        throw new NotFoundException(`PractitionerSocialWork entry with ID "${id}" not found.`);
      }
      if (!entry.deletedAt) {
        throw new ErrorManager(`PractitionerSocialWork entry with ID "${id}" is not deleted.`, 400);
      }
      await this.repository.recover(entry);
      return this.getOne(id);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ErrorManager) throw error;
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }
}