import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '../../common/bases/base.service';
import { ErrorManager } from '../../common/exceptions/error.manager';
import { CreateLocationDto, UpdatelocationDto } from '../../domain/dtos';
import { Branch, Location } from '../../domain/entities';
import { Repository } from 'typeorm';

@Injectable()
export class LocationService extends BaseService<
  Location,
  CreateLocationDto,
  UpdatelocationDto
> {
  constructor(
    @InjectRepository(Location) protected locationRepository: Repository<Location>,
    @InjectRepository(Branch) protected branchRepository: Repository<Branch>
  ) {
    super(locationRepository);
  }

  async createlocation(createlocationDto: CreateLocationDto): Promise<Location> {
    try {
      const { branchId, address, ...data } = createlocationDto;

      const branch = await this.branchRepository.findOne({
        where: { id: branchId },
      });

      if (!branch) {
        throw new ErrorManager(`Branch with ID ${branchId} not found`, 404);
      }

      const newlocation = this.locationRepository.create({
        ...data,
        branch,
        address: address ? address : null,
      });

      return await this.locationRepository.save(newlocation);
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async getAll(page: number = 1, limit: number = 10): Promise<{ locations: Location[]; total: number; page: number; limit: number; previousPage: number | null; }> {
    try {
      const [data, total] = await this.locationRepository.findAndCount({
        where: { deletedAt: null },
        skip: (page - 1) * limit,
        take: limit,
      });

      return { 
        locations: data, 
        total, 
        page, 
        limit,
        previousPage: page > 1 ? page - 1 : null,
      };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async getOne(id: string): Promise<Location> {
    try {
      const location = await this.locationRepository.findOne({
        where: { id },
        relations: [
          'address',
          'address.locality',
          'practitioners', 
          'branch', 
          'appointmentSlot', 
          'secretary'
        ],
      });
  
      if (!location) {
        throw new NotFoundException(`location with ID ${id} not found`);
      }
  
      return location;
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async update(id: string, updatelocationDto: UpdatelocationDto): Promise<Location> {
    try {
      const location = await this.getOne(id);

      if (!location) {
        throw new NotFoundException(`location with ID ${id} not found`);
      }

      Object.assign(location, updatelocationDto);
      return await this.locationRepository.save(location);
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async softDelete(id: string): Promise<{ message: string }> {
    try {
      const location = await this.getOne(id);
      
      if (!location) {
        throw new NotFoundException(`location with ID ${id} not found`);
      }

      await this.locationRepository.softRemove(location);
      return { message: 'location soft deleted successfully' };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async recover(id: string): Promise<{ message: string }> {
    try {
      const location = await this.locationRepository.findOne({
        where: { id },
        withDeleted: true,
      });

      if (!location || !location.deletedAt) {
        throw new NotFoundException(`location with ID ${id} not found or not deleted`);
      }

      await this.locationRepository.recover(location);
      return { message: 'location recovered successfully' };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

}
