import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Diagnostic } from '../../domain/entities';
import { Repository } from 'typeorm';
import { CreateDiagnosticDto, SerializerDiagnosticDto, UpdateDiagnosticDto } from '../../domain/dtos';
import { ErrorManager } from '../../common/exceptions/error.manager';
import { getPagingData, PaginationMetadata } from '../../common/util/pagination-data.util';
import { PaginationDto } from '../../common/dtos';

@Injectable()
export class DiagnosticService {
  constructor(
    @InjectRepository(Diagnostic)
    private readonly repository: Repository<Diagnostic>,
  ) {}

  async findAll(): Promise<Diagnostic[]> {
    try {
      return await this.repository.find({ where: { deletedAt: null } });
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async findAllPaginated(paginationDto: PaginationDto){
    const { page, limit } = paginationDto;
    const [diagnostics, total] = await this.repository.findAndCount({
      where: { deletedAt: null},
      skip: (page - 1) * limit,
      take: limit 
    })

    const totalPages = Math.ceil(total / limit);
    const nextPage = page < totalPages ? page + 1 : null;
    const previousPage = page > 1 ? page - 1 : null;

    return {
      data: diagnostics as SerializerDiagnosticDto[],
      meta: {
        totalPages,
        currentPage: page,
        previousPage,
        nextPage,
        totalItems: total
      }
    }
  }

  async findOne(id: string): Promise<Diagnostic> {
    try {
      const diagnostic = await this.repository.findOne({ where: { id, deletedAt: null } });
      if (!diagnostic) {
        throw ErrorManager.createSignatureError(`Diagnostic with id ${id} not found`);
      }
      return diagnostic;
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async create(createDiagnosticDto: CreateDiagnosticDto): Promise<Diagnostic> {
    try {
      const newDiagnostic = this.repository.create(createDiagnosticDto);
      const saved = await this.repository.save(newDiagnostic);
      return await this.findOne(saved.id);
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async update(id: string, updateDiagnosticDto: UpdateDiagnosticDto): Promise<Diagnostic> {
    try {
      const diagnostic = await this.findOne(id);
      const updated = Object.assign(diagnostic, updateDiagnosticDto);
      await this.repository.save(updated);
      return await this.findOne(id);
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async remove(id: string): Promise<string> {
    try {
      const diagnostic = await this.findOne(id);
      await this.repository.remove(diagnostic);
      return `Diagnostic with id ${id} has been permanently deleted.`;
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async softRemove(id: string): Promise<string> {
    try {
      const diagnostic = await this.findOne(id);
      await this.repository.softRemove(diagnostic);
      return `Diagnostic with id ${id} has been soft deleted.`;
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async restore(id: string): Promise<Diagnostic> {
    try {
      const diagnostic = await this.repository.findOne({ where: { id }, withDeleted: true });
      if (!diagnostic) {
        throw ErrorManager.createSignatureError(`Diagnostic with id ${id} not found`);
      }
      return await this.repository.recover(diagnostic);
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async findFilteredByName(
    name: string,
    paginationDto: PaginationDto
  ): Promise<{ data: Diagnostic[]; meta: PaginationMetadata; msg: string }> {
    try {
      const { page, limit } = paginationDto;
      const queryBuilder = this.repository.createQueryBuilder('diagnostic');
      
      // Sólo retornar diagnósticos no eliminados
      queryBuilder.where('diagnostic.deletedAt IS NULL');
      
      if (name) {
        queryBuilder.andWhere('diagnostic.name ILIKE :name', { name: `%${name}%` });
      }
      
      queryBuilder.skip((page - 1) * limit).take(limit);
  
      // getManyAndCount retorna [data, total], pero getPagingData solo requiere 3 parámetros
      const [data, total] = await queryBuilder.getManyAndCount();
      const meta = getPagingData(data, page, limit);
      return { data, meta, msg: 'Diagnostics filtered by name retrieved successfully' };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }
}
