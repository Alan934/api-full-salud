import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '../../common/bases/base.service';
import { CreatePaymentDto, UpdatePaymentDto } from '../../domain/dtos';
import { Payment, PractitionerRole, SocialWork } from '../../domain/entities';
import { IsNull, Repository } from 'typeorm';
import { ErrorManager } from '../../common/exceptions/error.manager';
import { PaymentFilteredPaginationDto } from '../../domain/dtos/payment/payment-filtered-pagination.dto';

@Injectable()
export class PaymentService extends BaseService<
  Payment,
  CreatePaymentDto,
  UpdatePaymentDto
> {
  constructor(
    @InjectRepository(Payment)
    protected repository: Repository<Payment>,
    @InjectRepository(PractitionerRole)
    private readonly practitionerRepository: Repository<PractitionerRole>,
    @InjectRepository(SocialWork)
    private readonly socialWorkRepository: Repository<SocialWork>,
  ) {
    super(repository);
  }

  async create(createDto: CreatePaymentDto): Promise<Payment> {
    try {
      const { paymentTime, socialWork, practitionerRole } = createDto;
  
      const foundPractitionerRole = await this.practitionerRepository.findOne({
        where: { id: practitionerRole.id, deletedAt: null },
      });
  
      if (!foundPractitionerRole) {
        throw new ErrorManager(`PractitionerRole with ID "${practitionerRole.id}" not found`, 404);
      }
  
      const foundSocialWork = await this.socialWorkRepository.findOne({
        where: { id: socialWork.id, deletedAt: null },
      });
  
      if (!foundSocialWork) {
        throw new ErrorManager(`SocialWork with ID "${socialWork.id}" not found`, 404);
      }
  
      const newPayment = this.repository.create({
        paymentTime,
        practitionerRole: foundPractitionerRole,
        socialWork: foundSocialWork,
      });
  
      return await this.repository.save(newPayment);
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async findAllPaginated(filterDto: PaymentFilteredPaginationDto): Promise<{ data: Payment[]; lastPage: number; total: number; msg?: string }> {
    try {
      const { page = 1, limit = 10, socialWorkId, practitionerRoleId, paymentTime } = filterDto;
  
      const queryBuilder = this.repository
        .createQueryBuilder('payment')
        .leftJoinAndSelect('payment.practitionerRole', 'practitionerRole')
        .leftJoinAndSelect('payment.socialWork', 'socialWork')
        .where('payment.deletedAt IS NULL');
  
      if (practitionerRoleId) {
        queryBuilder.andWhere('practitionerRole.id = :practitionerRoleId', { practitionerRoleId });
      }
  
      if (socialWorkId) {
        queryBuilder.andWhere('socialWork.id = :socialWorkId', { socialWorkId });
      }
  
      if (paymentTime) {
        queryBuilder.andWhere('payment.paymentTime = :paymentTime', { paymentTime });
      }
  
      queryBuilder.skip((page - 1) * limit).take(limit);
  
      const [payments, total] = await queryBuilder.getManyAndCount();
      const lastPage = Math.ceil(total / limit);
      const msg = total === 0 ? 'No payments found matching the criteria' : undefined;
  
      return { data: payments, total, lastPage, msg };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }
  
  async getOne(id: string): Promise<Payment> {
    try {
      const payment = await this.repository.findOne({
        where: { id },
        relations: ['practitionerRole', 'socialWork'],
      });

      if (!payment) {
        throw new NotFoundException(`Payment with ID ${id} not found`);
      }

      return payment;
    } catch (error) {
      throw error instanceof NotFoundException ? error : new NotFoundException('Error fetching payment');
    }
  }

async getByPractitionerRoleId(practitionerRoleId: string): Promise<Payment[]> {
  const payments = await this.repository.find({
    where: {
      practitionerRole: { id: practitionerRoleId },
      deletedAt: IsNull()
    },
    relations: ['practitionerRole', 'socialWork'],
  });

  if (!payments.length) {
    throw new NotFoundException(`No payments found for practitionerRole with ID ${practitionerRoleId} or the payment is softDelete`);
  }
  return payments;
}


  async update(id: string, updateDto: UpdatePaymentDto): Promise<Payment> {
    try {
      const payment = await this.getOne(id); 
      const { practitionerRole, socialWork, ...rest } = updateDto;
  
      if (practitionerRole) {
        const foundPractitionerRole = await this.practitionerRepository.findOne({
          where: { id: practitionerRole.id, deletedAt: null },
        });
  
        if (!foundPractitionerRole) {
          throw new ErrorManager(
            `PractitionerRole with ID "${practitionerRole.id}" not found`,
            404
          );
        }
        payment.practitionerRole = foundPractitionerRole;  
      }
  
      if (socialWork) {
        const foundSocialWork = await this.socialWorkRepository.findOne({
          where: { id: socialWork.id, deletedAt: null },
        });
  
        if (!foundSocialWork) {
          throw new ErrorManager(
            `SocialWork with ID "${socialWork.id}" not found`,
            404
          );
        }
        payment.socialWork = foundSocialWork; 
      }
      Object.assign(payment, rest);
  
      return await this.repository.save(payment);
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }
  
  async softDeleted(id: string): Promise<{ message: string }> {
    try {
      const payment = await this.getOne(id);
     
      if (payment.deletedAt) {
        return { message: `Payment with ID "${id}" is already soft deleted` };
      }      

      await this.repository.softRemove(payment);
      return { message: `Payment with ID "${id}" soft deleted successfully` };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async recover(id: string): Promise<Payment> {
    try {
      const payment = await this.repository.findOne({
        where: { id },
        withDeleted: true,
        relations: ['practitionerRole', 'socialWork'],
      });

      if (!payment) throw new ErrorManager(`Payment with ID "${id}" not found`, 404);
      if (!payment.deletedAt) throw new ErrorManager(`Payment with ID "${id}" is not soft-deleted`, 400);

      await this.repository.recover(payment);

      return await this.repository.findOne({
        where: { id },
        relations: ['practitionerRole', 'socialWork'],
      });
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }
}