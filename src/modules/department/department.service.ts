import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '../../common/bases/base.service';
import { PaginationDto } from '../../common/dtos/pagination-common.dto';
import { ErrorManager } from '../../common/exceptions/error.manager';
import {
  getPagingData,
  PaginationMetadata
} from '../../common/util/pagination-data.util';
import { CreateDepartmentDto, SerializerDepartmentDto, UpdateDepartmentDto } from '../../domain/dtos';
import { Department, Province } from '../../domain/entities';
import { Repository } from 'typeorm';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Department) protected repository: Repository<Department>,
    @InjectRepository(Province) protected provinceRepository: Repository<Province>
  ){}

  async findByProvince(
    provinceId: string,
    paginationDto: PaginationDto
  ): Promise<{ data: Department[]; meta: PaginationMetadata }> {
    try {
      const { page, limit } = paginationDto;
      const departments = await this.repository.find({
        where: { province: { id: provinceId } },
        skip: (page - 1) * limit,
        take: limit, // Filtra por provinceId y que no esté eliminada
        loadEagerRelations: false // Desactiva la carga de relaciones eager
      });
      if (!departments || departments.length === 0) {
        throw new ErrorManager(
          `Province with id ${provinceId} not found`,
          HttpStatus.NOT_FOUND
        );
      }
      const meta = getPagingData(departments, page, limit);
      return {
        data: departments,
        meta
      };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

   async getOne(id: string): Promise<Department> {
    try {
      const department = await this.repository.findOne({
        where: { id },
        relations: ['province', 'province.country']
      });
      if (!department) {
        throw new ErrorManager(
          `Department with id ${id} not found`,
          HttpStatus.NOT_FOUND
        );
      }
      return department;
    } catch (error) {
        if(error instanceof NotFoundException) {
          throw error;
        }
        throw new NotFoundException(`Clinical  Indication with ID ${id} not found`);
    }
  }

async getAll(
    paginationDto: PaginationDto
  ): Promise<{ data: Department[]; meta: PaginationMetadata }> {
    try {
      const { page, limit } = paginationDto;
      const departments = await this.repository.find({
        where: { deletedAt: null }, // Filtra por provinceId y que no esté eliminada
        skip: (page - 1) * limit,
        take: limit, // Filtra por provinceId y que no esté eliminada
        loadEagerRelations: false // Desactiva la carga de relaciones eager
      });
      if (!departments || departments.length === 0) {
        throw new ErrorManager(
          `departments not found`,
          HttpStatus.NOT_FOUND
        );
      }
      const meta = getPagingData(departments, page, limit);
      return {
        data: departments,
        meta
      };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async create( departmentDto: CreateDepartmentDto): Promise<Department> {
    try {
      // 1. Verificar si la provincia con el ID dado existe
      const existingProvince = await this.provinceRepository.findOne({
        where: { id: departmentDto.provinceId }, // Usar provinceId
      });

      // Si la provincia no existe, lanzamos una excepción
      if (!existingProvince) {
        throw new NotFoundException(
          `Province with ID '${departmentDto.provinceId}' not found. Please ensure the province exists before creating a department.`, // Usar provinceId
        );
      }

      // 2. Si la provincia existe, procedemos a crear el departamento
      const departmentToCreate = this.repository.create({
        name: departmentDto.name,
        province: { id: departmentDto.provinceId }, // Usar provinceId
      });

      // 3. Guardamos el nuevo departamento
      return await this.repository.save(departmentToCreate);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async update(id: string, departmentDto: UpdateDepartmentDto): Promise<Department> {
    try {
       const department = await this.getOne(id);
      if (!department) {
        throw new NotFoundException(`Department with ID ${id} not found`);
      }
      // Verificar si la provincia existe
      let existingProvince: Province | null = null;
      if(departmentDto.provinceId) {
        existingProvince = await this.provinceRepository.findOne({
          where: { id: departmentDto.provinceId }, // Usar provinceId
        });
        if (!existingProvince) {
          throw new NotFoundException(
            `Province with ID '${departmentDto.provinceId}' not found. Please ensure the province exists before updating the department.`, // Usar provinceId
          );
        }
      }
      // Actualizar el departamento
      department.name = departmentDto.name;
      department.province = existingProvince;
      return await this.repository.save(department);
    } catch (error) {     
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

   async softDeleted(id: string): Promise<{ message: string }> {
    try {
      const clinicalIndication = await this.getOne(id);
      await this.repository.softDelete(clinicalIndication.id);
      return { message: 'Department deleted successfully' };
    } catch (error) {
      throw new NotFoundException(`Departmentwith ID ${id} not found`);
    }
  }

  async restore(id: string): Promise<Department> {
      try {
        const clinicalIndication = await this.repository.findOne({
          where: { id },
          withDeleted: true,
          //relations: ['prescription', 'indicationsDetails']
          });
        if (!clinicalIndication) {
          throw new NotFoundException(`Department with ID ${id} not found`);
        }
        if(!clinicalIndication.deletedAt){
          throw new ErrorManager(`Department with ID ${id} is not soft-deleted`, 400); 
        }
        //const updateResult = await this.clinicalIndicationRepository.restore(clinicalIndication);
  
        //otro modo de restaurar, lo de arriba no funciona, getOne no encuentra clinical indication con id dado
        const updateResult = await this.repository.update(id, { deletedAt: null });
        if (updateResult.affected === 0) {
          // Esto podría ocurrir si el ID no existe o si la actualización no tuvo efecto
          // (ej. ya estaba null, pero lo verificamos antes)
          throw new Error(`Failed to restore clinical indication with ID "${id}".`);
      } 
        return await this.repository.findOne({
          where: { id },
          relations: ['province', 'province.country']
        });
      } catch (error) {
        throw new NotFoundException(`Department with ID ${id} not found cacth error, error: ${error}`);
      }
    }
  
  



}


