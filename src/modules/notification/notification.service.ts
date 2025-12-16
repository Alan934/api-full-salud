import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '../../common/bases/base.service';
import { ErrorManager } from '../../common/exceptions/error.manager';
import { CreateNotificationDto, SerializerNotificationDto, UpdateNotificationDto } from '../../domain/dtos';
import { Notification, Patient, Practitioner, User } from '../../domain/entities';
import { Repository, EntityManager } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { PaginationDto } from '../../common/dtos';

@Injectable()
export class NotificationService extends BaseService<
  Notification,
  CreateNotificationDto,
  UpdateNotificationDto
> {
  constructor(
    @InjectRepository(Notification)
    protected repository: Repository<Notification>,
    @InjectRepository(User) // Inyecta el repositorio de User
    private readonly userRepository: Repository<User>,
    @InjectRepository(Patient) // Inyecta el repositorio de User
    private readonly patientRepository: Repository<Patient>,
    @InjectRepository(Practitioner) // Inyecta el repositorio de User
    private readonly practitionerRepository: Repository<Practitioner>,
    private readonly authService: AuthService

    
  ) {
    super(repository);
  }

  // Eliminación lógica de las notificaciones de un usuario
  async softRemoveForUserWithManager(
    userId: string,
    entityManager: EntityManager
  ) {
    try {
      //get user by id
      const user = await  this.authService.getUserById(userId)
      let notifications = null
      if(user.role == 'patient'){
        notifications = await this.repository.find({
          where: { patient: { id: userId } }
        }); // Obtiene las notificaciones del usuario
      }
      if(user.role == 'practitioner'){
        notifications = await this.repository.find({
          where: { practitioner: { id: userId } }
        }); // Obtiene las notificaciones del usuario
       }

      await entityManager.softRemove(notifications); // Marca deletedAt
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  // Restauración lógica de las notificaciones de un usuario
  async restoreForUserWithManager(
    userId: string,
    entityManager: EntityManager
  ) {
    try {
      // Obtiene las notificaciones que tienen la misma fecha de eliminación del usuario para evitar restaurar aquellas que se han eliminado antes
      const notifications = await entityManager
        .createQueryBuilder(Notification, 'notification')
        .withDeleted() // Incluye las notificaciones y usuarios eliminados logicamente
        .leftJoinAndSelect('notification.user', 'user')
        .where('user.id = :userId', { userId })
        .andWhere('notification.deletedAt = user.deletedAt')
        .getMany();

      await entityManager.recover(notifications);
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

 
  async createNotification(notification: CreateNotificationDto, entityManager?: EntityManager): Promise<Notification> {
    const queryRunner = entityManager ? null : this.repository.manager.connection.createQueryRunner();
    
    try {
      if (queryRunner) {
        await queryRunner.connect();
        await queryRunner.startTransaction();
      }
  
      const manager = entityManager || queryRunner.manager;
      const notificationToCreate = this.repository.create({
        text: notification.text,
        title: notification.title,
        read: false,
        createdAt: new Date().toISOString() // Asegura el formato correcto
      });
  
      if (notification.patientId) {
        // Verifica que exista el paciente en la tabla patient
        const patientExists = await manager.query(
          `SELECT 1 FROM patient WHERE id = $1`,
          [notification.patientId]
        );
        
        if (!patientExists || patientExists.length === 0) {
          throw new ErrorManager(`Patient with id ${notification.patientId} not found`, 404);
        }
        
        notificationToCreate.patient = { id: notification.patientId } as any;
      } 
      else if (notification.practitionerId) {
        // Verifica que exista el practitioner en la tabla practitioner
        const practitionerExists = await manager.query(
          `SELECT 1 FROM practitioner WHERE id = $1`,
          [notification.practitionerId]
        );
        
        if (!practitionerExists || practitionerExists.length === 0) {
          throw new ErrorManager(`Practitioner with id ${notification.practitionerId} not found`, 404);
        }
        
        notificationToCreate.practitioner = { id: notification.practitionerId } as any;
      }
  
      // Guarda directamente usando queryRunner o entityManager
      const savedNotification = await manager.save(Notification, notificationToCreate);
  
      if (queryRunner) {
        await queryRunner.commitTransaction();
      }
  
      return savedNotification;
    } catch (error) {
      if (queryRunner) {
        await queryRunner.rollbackTransaction();
      }
      throw ErrorManager.createSignatureError((error as Error).message);
    } finally {
      if (queryRunner) {
        await queryRunner.release();
      }
    }
  }

  async getNotificationByPatient(patientId: string, page: number, limit: number): Promise<
    {notifications: Notification[];
    total: number;
    page: number;
    limit: number;
    previousPage: number | null;}>{
    try {
      const [data, total] = await this.repository.findAndCount({
        where:{
          patient:{id: patientId}, 
          deletedAt: null,
        },
        skip: (page - 1) * limit,
        take: limit,
      })
      if (!data.length) {
        throw new NotFoundException(`No Notifications found for specialist with ID ${patientId}`);
      }
      return {
        notifications: data,
        total,
        page,
        limit,
        previousPage: page > 1 ? page - 1 : null,
      };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
    }

    async getNotificationByPracttioner(practitionerId: string, page: number, limit: number): Promise<
    {notifications: Notification[];
    total: number;
    page: number;
    limit: number;
    previousPage: number | null;}>{
    try {
      const [data, total] = await this.repository.findAndCount({
        where:{
          practitioner:{id: practitionerId}, 
          deletedAt: null,
        },
        skip: (page - 1) * limit,
        take: limit,
      })
      if (!data.length) {
        throw new NotFoundException(`No Notifications found for specialist with ID ${practitionerId}`);
      }
      return {
        notifications: data,
        total,
        page,
        limit,
        previousPage: page > 1 ? page - 1 : null,
      };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  // Eliminación lógica de una entidad
  async softRemove(id: string): Promise<string> {
    try {
      const entity = await this.repository.findOne(
        {where: {id: id}}
      ); // Verifica que la entidad existe
      await this.repository.softRemove(entity); // Marca deletedAt
      return `Entity with id ${id} soft deleted`;
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  // recuperacion lógica de una entidad
  async softRecover(id: string): Promise<string> {
    try {
      const entity = await this.repository.findOne(
        {where: {id: id}}
      ); // Verifica que la entidad existe
      await this.repository.restore(entity); // Marca deletedAt
      return `Entity with id ${id} soft deleted`;
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async findAllPaginated(paginationDto: PaginationDto){
    const { page, limit } = paginationDto;
    const [notifications, total] = await this.repository.findAndCount({
      where: { deletedAt: null},
      skip: (page - 1) * limit,
      take: limit
    })

    const totalPages = Math.ceil(total / limit);
    const nextPage = page < totalPages ? page + 1 : null;
    const previousPage = page > 1 ? page - 1 : null;

    return {
      data: notifications as SerializerNotificationDto[],
      meta: {
        totalPages,
        currentPage: page,
        previousPage,
        nextPage,
        totalItems: total
      }
    }
  }
    

}
