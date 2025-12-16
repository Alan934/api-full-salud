import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '../../common/bases/base.service';
import { CreateCategoryDto, UpdateCategoryDto } from '../../domain/dtos';
import { Category } from '../../domain/entities';
import { Repository, Not } from 'typeorm';
import { ErrorManager } from '../../common/exceptions/error.manager';
import { getPagingData, PaginationMetadata } from '../../common/util/pagination-data.util';
import { FilteredCategoryDto } from '../../domain/dtos/category/filtered-category.dto';

@Injectable()
export class CategoryService extends BaseService<Category, CreateCategoryDto, UpdateCategoryDto> {
  constructor(
    @InjectRepository(Category)
    protected repository: Repository<Category>
  ) {
    super(repository);
  }

  async createCategory(createCategoryDto: CreateCategoryDto) {
    try {
      const { name } = createCategoryDto;
      
      const existingCategory = await this.repository.findOne({
        where: { name }
      });

      if (existingCategory) {
        throw new ErrorManager(`Categoría con nombre ${name} ya existe`, 409);
      }

      const category = this.repository.create(createCategoryDto);
      const savedCategory = await this.repository.save(category);
      
      return savedCategory;
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async findAllFiltered(filteredCategory: FilteredCategoryDto): Promise<{ 
    data: Category[]; 
    meta: PaginationMetadata 
  }> {
    try {
      const { page = 1, limit = 10, name, categoryId } = filteredCategory;
      const queryBuilder = this.repository.createQueryBuilder('category')
        .where('category.deletedAt IS NULL');
      
      if (categoryId) {
        queryBuilder.andWhere('category.id = :id', { id: categoryId });
      }
      
      if (name) {
        queryBuilder.andWhere('LOWER(category.name) LIKE LOWER(:name)', { 
          name: `%${name}%` 
        });
      }

      queryBuilder.orderBy('category.createdAt', 'DESC');
      queryBuilder.skip((page - 1) * limit).take(limit);

      const [data, total] = await queryBuilder.getManyAndCount();
      const meta = getPagingData(data, page, limit);
      
      return { data, meta };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async findOne(id: string): Promise<Category> {
    try {
      const category = await this.repository.findOne({ 
        where: { id, deletedAt: null } 
      });

      if (!category) {
        throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
      }

      return category;
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    try {
      const category = await this.findOne(id);
      
      if (updateCategoryDto.name) {
        const existingCategory = await this.repository.findOne({
          where: { name: updateCategoryDto.name, id: Not(id) }
        });

        if (existingCategory) {
          throw new ErrorManager(`Categoría con nombre ${updateCategoryDto.name} ya existe`, 409);
        }
      }

      Object.assign(category, updateCategoryDto);
      return await this.repository.save(category);
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async softDelete(id: string): Promise<{ message: string }> {
    try {
      const category = await this.findOne(id);

      await this.repository.softRemove(category);

      return { message: 'Category soft deleted successfully' };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async recover(id: string): Promise<{ message: string }> {
    try {
      const category = await this.repository.findOne({
        where: { id },
        withDeleted: true,
      });

      if (!category || !category.deletedAt) {
        throw new NotFoundException(`Patient with ID ${id} not found or not deleted`);
      }

      await this.repository.recover(category);

      return { message: 'Category recovered successfully' };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }
}