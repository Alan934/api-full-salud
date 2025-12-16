import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Country } from '../../domain/entities';
import { Repository } from 'typeorm';
import { BaseService } from '../../common/bases/base.service';
import { CreateCountryDto, UpdateCountryDto } from '../../domain/dtos';
import { ErrorManager } from '../../common/exceptions/error.manager';
import { PaginationMetadata, getPagingData } from '../../common/util/pagination-data.util';
import { PaginationDto } from '../../common/dtos';
import { FilteredCountryDto } from '../../domain/dtos/country/FilteredCountry.dto';

@Injectable()
export class CountryService extends BaseService<Country, CreateCountryDto, UpdateCountryDto> {
  constructor(
    @InjectRepository(Country) protected repository: Repository<Country>
  ) {
    super(repository);
  }

  async findOne(id: string): Promise<Country> {
    try {
      const country = await this.repository.findOne({ where: { id, deletedAt: null } });
      if (!country) {
        throw ErrorManager.createSignatureError(`Country with id ${id} not found`);
      }
      return country;
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async create(createCountryDto: CreateCountryDto): Promise<Country> {
    try {
      const newCountry = this.repository.create(createCountryDto);
      const saved = await this.repository.save(newCountry);
      return await this.findOne(saved.id);
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async update(id: string, updateCountryDto: UpdateCountryDto): Promise<Country> {
    try {
      const country = await this.findOne(id);
      const updated = Object.assign(country, updateCountryDto);
      await this.repository.save(updated);
      return await this.findOne(id);
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async remove(id: string): Promise<string> {
    try {
      const country = await this.findOne(id);
      await this.repository.remove(country);
      return `Country with id ${id} has been permanently deleted.`;
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async softRemove(id: string): Promise<string> {
    try {
      const country = await this.findOne(id);
      await this.repository.softRemove(country);
      return `Country with id ${id} has been soft deleted.`;
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async restore(id: string): Promise<Country> {
    try {
      const country = await this.repository.findOne({
        where: { id },
        withDeleted: true,
      });
      if (!country) {
        throw ErrorManager.createSignatureError(`Country with id ${id} not found`);
      }
      return await this.repository.recover(country);
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async findAll(
    paginationDto: PaginationDto
  ): Promise<{ data: Country[]; meta: PaginationMetadata }> {
    try {
      const { page, limit } = paginationDto;
      const [data, total] = await this.repository.findAndCount({
        skip: (page - 1) * limit,
        take: limit,
        where: { deletedAt: null },
      });
      const meta = getPagingData(data, page, limit);
      return { data, meta };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async findAllIncludeDeletes(
    paginationDto: PaginationDto
  ): Promise<{ data: Country[]; meta: PaginationMetadata }> {
    try {
      const { page, limit } = paginationDto;
      const [data, total] = await this.repository.findAndCount({
        skip: (page - 1) * limit,
        take: limit,
        withDeleted: true,
      });
      const meta = getPagingData(data, page, limit);
      return { data, meta };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async findAllFiltered(
    filteredDto: FilteredCountryDto,
    paginationDto: PaginationDto
  ): Promise<{ data: Country[]; meta: PaginationMetadata; msg: string }> {
    try {
      const { page, limit } = paginationDto;
      const queryBuilder = this.repository.createQueryBuilder('country');

      if (filteredDto.name) {
        queryBuilder.andWhere('country.name LIKE :name', { name: `%${filteredDto.name}%` });
      }

      queryBuilder.skip((page - 1) * limit).take(limit);
      const [data, total] = await queryBuilder.getManyAndCount();
      const meta = getPagingData(data, page, limit);
      return { data, meta, msg: 'Filtered countries retrieved successfully' };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }
}