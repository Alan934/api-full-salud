import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '../../common/bases/base.service';
import { CreateChargeItemDto, UpdateChargeItemDto } from '../../domain/dtos';
import { ChargeItem } from '../../domain/entities';
import { Repository } from 'typeorm';
import { PractitionerService } from '../practitioner/practitioner.service';
import { ProcedureService } from '../procedure/procedure.service';
import { ChargeItemPaginatedDTO } from '../../domain/dtos/charge-item/charge-item-filtered-pagination.dto';
import { ErrorManager } from '../../common/exceptions/error.manager';

@Injectable()
export class ChargeItemService{
  constructor(
    @InjectRepository(ChargeItem) protected repository: Repository<ChargeItem>,
    private readonly practitionerService: PractitionerService, // Inyecta el servicio de Practitioner
    private readonly procedureService: ProcedureService,       // Inyecta el servicio de Procedure
  ) {}

  async create(createChargeItemDto: CreateChargeItemDto): Promise<ChargeItem> {
    const { price, practitionerId, procedureId } = createChargeItemDto;

    const practitioner = await this.practitionerService.getOne(practitionerId);
    if (!practitioner) {
      throw new NotFoundException(
        `No se encontró el médico con el ID: ${practitionerId}`,
      );
    }

    const procedure = await this.procedureService.findOne(procedureId);
    if (!procedure) {
      throw new NotFoundException(
        `No se encontró el procedimiento con el ID: ${procedureId}`,
      );
    }

    const chargeItem = this.repository.create({
      price,
      practitioner,
      procedure,
    });

    return await this.repository.save(chargeItem);
  }

  async findAllPaginated(
    filterPaginationDto: ChargeItemPaginatedDTO
  ): Promise<{ data: ChargeItem[]; lastPage: number; total: number; msg?: string }> {
    try {
      const { page, limit, ...filters } = filterPaginationDto;
       
      const queryBuilder = this.repository
      .createQueryBuilder('charge_item')
        .leftJoinAndSelect('charge_item.practitioner', 'practitioner')
        .leftJoinAndSelect('charge_item.procedure', 'procedure')
        .where('charge_item.deletedAt IS NULL')
  
        if(filters.price !== undefined){
          queryBuilder.andWhere('charge_item.price =  :price', {price: filters.price})
        }
        if (filters.practitionerId !== undefined) {
          queryBuilder.andWhere('practitioner.id = :practitionerId', { practitionerId: filters.practitionerId });
        }
        if(filters.procedureId !== undefined){
          queryBuilder.andWhere('procedure.id =  :procedureId', {procedureId: filters.procedureId})
        }

        queryBuilder.orderBy('charge_item.createdAt', 'ASC')
        queryBuilder.skip((page-1) * limit).take(limit)

        const [charge_items, total] = await queryBuilder.getManyAndCount()
        const lastPage = Math.ceil(total / limit);
        let msg = '';
        if (total === 0) msg = 'No charge items found matching the criteria';

        return { data: charge_items, lastPage, total, msg };

      } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async getOne(id: string): Promise<ChargeItem> {
  try {
  const charge = await this.repository.findOne({
    where: { id },
    relations: ['practitioner', 'procedure']
  });

  if (!charge) {
    throw new NotFoundException(`Charge Item with ID ${id} not found`);
  }

  return charge;
  } catch (error) {
  if (error instanceof NotFoundException) {
    throw error;
  }
  throw new NotFoundException('Error searching charge item');
  }
  }

  async update(id: string, updateDto: UpdateChargeItemDto): Promise<ChargeItem> {
  try {
      const existingchargeItem = await this.getOne(id);

      const { practitionerId, procedureId, ...updateData } = updateDto;

      //
      if (practitionerId !== undefined) {
          const practitioner = await this.practitionerService.getOne(practitionerId);
          if (!practitioner) {
              throw new ErrorManager(`Practitioner with ID "${practitionerId}" not found or is soft-deleted`, 404);
          }
          existingchargeItem.practitioner = practitioner;
      }

      if (procedureId !== undefined) {
          const procedure = await this.procedureService.findOne(procedureId );
          if (!procedure) {
              throw new ErrorManager(`Procedure with ID "${procedureId}" not found or is soft-deleted`, 404);
          }
          existingchargeItem.procedure = procedure;
      }
      Object.assign(existingchargeItem, updateData);
      return await this.repository.save(existingchargeItem);

  } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
  }
  }

  async softDeleted(id: string): Promise<{ message: string }> {
  try {
      const charge_item = await this.getOne(id);

      await this.repository.softRemove(charge_item);

      return { message: `Charge Item soft deleted successfully` };
  } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
  }
  }

  async recover(id: string): Promise<ChargeItem> {
    try {
        const charge_item = await this.repository.findOne({
            where: { id },
            withDeleted: true,
            relations: ['practitioner', 'procedure']
        });

        if (!charge_item) {
            throw new ErrorManager(`Charge Item with ID "${id}" not found`, 404);
        }

        if (!charge_item.deletedAt) {
            throw new ErrorManager(`ChargeIitem with ID "${id}" is not soft-deleted`, 400);
        }

        await this.repository.recover(charge_item);

        return await this.repository.findOne({
            where: { id },
            relations: ['practitioner', 'procedure']
        });

    } catch (error) {
        throw ErrorManager.createSignatureError((error as Error).message);
    }
  }


}
