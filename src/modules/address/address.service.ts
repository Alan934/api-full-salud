import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '../../common/bases/base.service';
import { CreateAddressDto, UpdateAddressDto } from '../../domain/dtos';
import { Address } from '../../domain/entities';
import { Repository } from 'typeorm';
import { ErrorManager } from '../../common/exceptions/error.manager';
import { PaginationMetadata, getPagingData } from '../../common/util/pagination-data.util';
import { FilteredAddressDto } from '../../domain/dtos/address/FilteredAddress.dto';
import { PaginationDto } from '../../common/dtos';

@Injectable()
export class AddressService extends BaseService<
  Address,
  CreateAddressDto,
  UpdateAddressDto
> {
  constructor(
    @InjectRepository(Address) protected repository: Repository<Address>
  ) {
    super(repository);
  }

  async findOne(id: string): Promise<Address> {
    try {
      const address = await this.repository.findOne({
        where: { id, deletedAt: null },
      });
      if (!address) {
        throw ErrorManager.createSignatureError(`Address with id ${id} not found`);
      }
      return address;
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async create(createAddressDto: CreateAddressDto): Promise<Address> {
    try {
      const newAddress = this.repository.create(createAddressDto);
      const saved = await this.repository.save(newAddress);
      return await this.findOne(saved.id);
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async update(id: string, updateAddressDto: UpdateAddressDto): Promise<Address> {
    try {
      const address = await this.findOne(id);
      const updated = Object.assign(address, updateAddressDto);
      await this.repository.save(updated);
      return await this.findOne(id);
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async remove(id: string): Promise<string> {
    try {
      const address = await this.findOne(id);
      await this.repository.remove(address);
      return `Address with id ${id} has been permanently deleted.`;
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async softRemove(id: string): Promise<string> {
    try {
      const address = await this.findOne(id);
      await this.repository.softRemove(address);
      return `Address with id ${id} has been soft deleted.`;
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async restore(id: string): Promise<Address> {
    try {
      const address = await this.repository.findOne({
        where: { id },
        withDeleted: true,
      });
      if (!address) {
        throw new ErrorManager.createSignatureError(`Address with id ${id} not found`);
      }
      return await this.repository.recover(address);
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async findAll(
    paginationDto: PaginationDto
  ): Promise<{ data: Address[]; meta: PaginationMetadata }> {
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
  ): Promise<{ data: Address[]; meta: PaginationMetadata }> {
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
    filteredDto: FilteredAddressDto,
    paginationDto: PaginationDto
  ): Promise<{ data: Address[]; meta: PaginationMetadata; msg: string }> {
    try {
      const { page, limit } = paginationDto;
      const { street, floor, zipCode, localityId } = filteredDto;

      const queryBuilder = this.repository.createQueryBuilder('address');

      if (street) {
        queryBuilder.andWhere('address.street LIKE :street', { street: `%${street}%` });
      }
      if (floor) {
        queryBuilder.andWhere('address.floor = :floor', { floor });
      }
      if (zipCode) {
        queryBuilder.andWhere('address.zipCode = :zipCode', { zipCode });
      }
      if (localityId) {
        queryBuilder.andWhere('address.locality.id = :localityId', { localityId });
      }

      queryBuilder.skip((page - 1) * limit).take(limit);

      const [data, total] = await queryBuilder.getManyAndCount();
      const meta = getPagingData(data, page, limit);
      return { data, meta, msg: 'Filtered addresses retrieved successfully' };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }
}