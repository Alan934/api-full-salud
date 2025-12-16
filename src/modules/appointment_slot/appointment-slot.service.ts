import { Injectable, BadRequestException, Inject, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AppointmentSlot, AppointmentSlotSchedule, Branch, Location, Practitioner } from '../../domain/entities';
import { EntityManager, Repository } from 'typeorm';
import { BaseService } from '../../common/bases/base.service';
import { CreateAppointmentSlotDto, UpdateAppointmentSlotDto, CreateAppointmentSlotScheduleDto, FilteredAppointmentSlotDto } from '../../domain/dtos';
import { ErrorManager } from '../../common/exceptions/error.manager';
import { PaginationMetadata, getPagingData } from '../../common/util/pagination-data.util';
import { PaginationDto } from '../../common/dtos';

@Injectable()
export class AppointmentSlotService extends BaseService<
  AppointmentSlot,
  CreateAppointmentSlotDto,
  UpdateAppointmentSlotDto
> {
  private readonly logger = new Logger(AppointmentSlotService.name);
  constructor(
    @InjectRepository(AppointmentSlot)
    protected slotRepo: Repository<AppointmentSlot>,
    @InjectRepository(Practitioner)
    private readonly practitionerRepository: Repository<Practitioner>,
    @InjectRepository(AppointmentSlotSchedule)
    private readonly scheduleRepo: Repository<AppointmentSlotSchedule>,
  ) {
    super(slotRepo);
  }

  async findOne(id: string): Promise<AppointmentSlot> {
    try {
      const slot = await this.repository.findOne({
        where: { id, deletedAt: null },
        relations: ['practitioner'],
      });
      if (!slot) {
        throw ErrorManager.createSignatureError(`AppointmentSlot with id ${id} not found`);
      }
      return slot;
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async createAppointmentSlot(dto: CreateAppointmentSlotDto): Promise<AppointmentSlot> {
    const practitioner = await this.practitionerRepository.findOne({ where: { id: dto.practitionerId } });
    if (!practitioner) throw new NotFoundException('Practitioner not found');

    return this.createSlotWithValidation(dto, practitioner);
  }

  public async createSlotWithValidation(
    slotData: CreateAppointmentSlotDto,
    practitioner: Practitioner,
    manager?: EntityManager
  ): Promise<AppointmentSlot> {

    const slotRepository = manager
      ? manager.getRepository(AppointmentSlot)
      : this.slotRepo;

    const scheduleRepository = manager
      ? manager.getRepository(AppointmentSlotSchedule)
      : this.scheduleRepo;


    // Validar datos
    this.validateSchedules(slotData.schedules);

    //  Obtener o crear schedules
    const schedulesEntities = await this.findOrCreateSchedules(slotData.schedules, scheduleRepository);

    // Prevenir duplicados
    const existingSlot = await slotRepository.findOne({
      where: { day: slotData.day, practitioner: { id: practitioner.id } },
      relations: ['schedules']
    });

    if (existingSlot) {
      const existingRanges = existingSlot.schedules.map(s => `${s.openingHour}-${s.closeHour}`);
      const newSchedules = schedulesEntities.filter(s => !existingRanges.includes(`${s.openingHour}-${s.closeHour}`));

      if (!newSchedules.length) {
        throw new BadRequestException(`Todos los intervalos enviados para el día ${slotData.day} ya existen`);
      }

      existingSlot.schedules.push(...newSchedules);
      return await slotRepository.save(existingSlot);
    }

    // Crear nuevo slot
    const newSlot = slotRepository.create({
      ...slotData,
      practitioner,
      schedules: schedulesEntities
    });
    return await slotRepository.save(newSlot);
  }

    // Nuevo método: siempre crea un slot nuevo sin fusionar schedules aunque ya exista otro mismo día
  public async createSlotWithoutMerge(
    slotData: CreateAppointmentSlotDto,
    practitioner: Practitioner,
    manager?: EntityManager
  ): Promise<AppointmentSlot> {
    this.logger?.debug?.(`[createSlotWithoutMerge] Inicio day=${slotData.day} practitioner=${practitioner.id}`);
    const slotRepository = manager
      ? manager.getRepository(AppointmentSlot)
      : this.slotRepo;
    const scheduleRepository = manager
      ? manager.getRepository(AppointmentSlotSchedule)
      : this.scheduleRepo;

    // Validaciones y obtención de schedules reutilizando lógica existente
    this.validateSchedules(slotData.schedules);
    const schedulesEntities = await this.findOrCreateSchedules(slotData.schedules, scheduleRepository);


    const newSlot = slotRepository.create({
      ...slotData,
      practitioner,
      schedules: schedulesEntities
    });
    const saved = await slotRepository.save(newSlot);
    this.logger?.debug?.(`[createSlotWithoutMerge] Creado slot id=${saved.id} day=${saved.day}`);
    return saved;
  }

  public validateSchedules(schedules: CreateAppointmentSlotScheduleDto[]) {
    if (!schedules?.length) {
      throw new BadRequestException('El campo schedules es obligatorio y no puede estar vacío');
    }

    for (const s of schedules) {
      if (!s.openingHour || !s.closeHour) {
        throw new BadRequestException('Cada schedule debe tener openingHour y closeHour definidos');
      }
      if (s.openingHour >= s.closeHour) {
        throw new BadRequestException('openingHour debe ser anterior a closeHour');
      }
      if (s.overtimeStartHour) {
        if (s.overtimeStartHour <= s.openingHour || s.overtimeStartHour >= s.closeHour) {
          throw new BadRequestException('overtimeStartHour debe estar entre openingHour y closeHour');
        }
      }
    }
  }

  public async findOrCreateSchedules(
    schedules: CreateAppointmentSlotScheduleDto[],
    repo: Repository<AppointmentSlotSchedule>
  ): Promise<AppointmentSlotSchedule[]> {
    const entities: AppointmentSlotSchedule[] = [];

    for (const s of schedules) {
      // Buscar por los 3 campos: openingHour, closeHour Y overtimeStartHour
      let entity = await repo.findOne({
        where: { 
          openingHour: s.openingHour, 
          closeHour: s.closeHour,
          overtimeStartHour: s.overtimeStartHour ?? null
        }
      });
      if (!entity) {
        entity = repo.create(s);
        await repo.save(entity);
      }
      entities.push(entity);
    }

    return entities;
  }

  async create(createSlotDto: CreateAppointmentSlotDto): Promise<AppointmentSlot> {
    try {
      const { practitionerId, ...rest } = createSlotDto as any;
      // Validación: evitar duplicados u horarios solapados para el mismo practitioner y día
      if (practitionerId && rest.day && rest.openingHour && rest.closeHour) {
        const overlap = await this.repository
          .createQueryBuilder('slot')
          .where('slot.practitioner_id = :practitionerId', { practitionerId })
          .andWhere('slot.day = :day', { day: rest.day })
          .andWhere('slot.deletedAt IS NULL')
          .andWhere(`(
            (slot.opening_hour = :openingHour AND slot.close_hour = :closeHour)
            OR (slot.opening_hour < :closeHour AND slot.close_hour > :openingHour)
          )`, {
            openingHour: rest.openingHour,
            closeHour: rest.closeHour,
          })
          .getOne();
        if (overlap) {
          throw new BadRequestException('Ya existe un horario igual o solapado para este profesional en ese día');
        }
      }
      const newSlot = this.repository.create(rest);
      if (practitionerId) {
        (newSlot as any).practitioner = { id: practitionerId };
      }
      const saved: AppointmentSlot = await this.repository.save(newSlot as any);
      return await this.findOne(saved.id);
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async update(
    id: string,
    updateDto: UpdateAppointmentSlotDto
  ): Promise<AppointmentSlot> {
    try {
      // Cargar el slot con sus schedules para poder actualizar la relación
      const existingAppointment = await this.repository.findOne({
        where: { id, deletedAt: null },
        relations: ['schedules']
      });
      if (!existingAppointment) {
        throw new ErrorManager(`AppointmentSlot with id ${id} not found`, 404);
      }

      const { practitionerId, schedules: schedulesDto, ...updateData } = updateDto as any;

      // Actualizar practitioner si corresponde
      if (practitionerId !== undefined) {
        const practitioner = await this.practitionerRepository.findOne({
          where: { id: practitionerId }
        });
        if (!practitioner) {
          throw new ErrorManager(
            `Practitioner with ID "${practitionerId}" not found or is soft-deleted`,
            404
          );
        }
        existingAppointment.practitioner = practitioner;
      }

      // Si envían schedules (incluso [] para limpiar), reemplazar la relación por el set deseado
      if (schedulesDto !== undefined) {
        const newScheduleEntities: AppointmentSlotSchedule[] = [];

        if (Array.isArray(schedulesDto) && schedulesDto.length > 0) {
          for (const scheduleDto of schedulesDto) {
            if (!scheduleDto) continue;

            // Si tiene id, obtener el schedule actual para construir el nuevo con los cambios
            if (scheduleDto.id) {
              const existingSchedule = await this.scheduleRepo.findOne({ where: { id: scheduleDto.id } });
              if (!existingSchedule) {
                throw new BadRequestException(`Schedule with id ${scheduleDto.id} not found`);
              }

              // Construir el schedule con los valores actuales + los cambios
              const updatedScheduleData = {
                openingHour: scheduleDto.openingHour ?? existingSchedule.openingHour,
                closeHour: scheduleDto.closeHour ?? existingSchedule.closeHour,
                overtimeStartHour: scheduleDto.overtimeStartHour !== undefined 
                  ? scheduleDto.overtimeStartHour 
                  : existingSchedule.overtimeStartHour
              };

              // Validar que los horarios sean correctos
              if (updatedScheduleData.openingHour >= updatedScheduleData.closeHour) {
                throw new BadRequestException('openingHour debe ser anterior a closeHour');
              }
              if (updatedScheduleData.overtimeStartHour) {
                if (updatedScheduleData.overtimeStartHour <= updatedScheduleData.openingHour || 
                    updatedScheduleData.overtimeStartHour >= updatedScheduleData.closeHour) {
                  throw new BadRequestException('overtimeStartHour debe estar entre openingHour y closeHour');
                }
              }

              // Buscar o crear schedule con esta combinación única
              const schedules = await this.findOrCreateSchedules([updatedScheduleData] as any, this.scheduleRepo);
              newScheduleEntities.push(...schedules);
            } 
            // Si no tiene id pero tiene openingHour y closeHour, es un nuevo schedule
            else if (scheduleDto.openingHour && scheduleDto.closeHour) {
              const schedules = await this.findOrCreateSchedules([scheduleDto] as any, this.scheduleRepo);
              newScheduleEntities.push(...schedules);
            } 
            // Si no tiene ni id ni los campos requeridos, error
            else {
              throw new BadRequestException('Each schedule item must include either id or both openingHour and closeHour');
            }
          }

          // Deduplicar por ID (en caso de que se repita el mismo schedule)
          const dedupMap = new Map<string, AppointmentSlotSchedule>();
          for (const s of newScheduleEntities) {
            if (!dedupMap.has(s.id)) dedupMap.set(s.id, s);
          }
          existingAppointment.schedules = Array.from(dedupMap.values());
        } else {
          // Si mandan un array vacío, limpiar horarios
          existingAppointment.schedules = [];
        }
      }

      // Asignar el resto de campos simples
      Object.assign(existingAppointment, updateData);

      return await this.repository.save(existingAppointment);
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async remove(id: string): Promise<string> {
    try {
      const slot = await this.findOne(id);
      await this.repository.remove(slot);
      return `AppointmentSlot with id ${id} has been permanently deleted.`;
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async softRemove(id: string): Promise<string> {
    try {
      const slot = await this.findOne(id);
      await this.repository.softRemove(slot);
      return `AppointmentSlot with id ${id} has been soft deleted.`;
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async restore(id: string): Promise<AppointmentSlot> {
    try {
      const slot = await this.repository.findOne({
        where: { id },
        withDeleted: true
      });
      if (!slot) {
        throw ErrorManager.createSignatureError(
          `AppointmentSlot with id ${id} not found`
        );
      }
      if (!slot.deletedAt) {
        throw new ErrorManager(
          `AppointmentSlot with ID "${id}" is not soft-deleted`,
          400
        );
      }
      return await this.repository.recover(slot);
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async findAll(
    paginationDto: PaginationDto
  ): Promise<{ data: AppointmentSlot[]; meta: PaginationMetadata }> {
    try {
      const { page, limit } = paginationDto;
      const [data, total] = await this.repository.findAndCount({
        skip: (page - 1) * limit,
        take: limit,
        where: { deletedAt: null },
        relations: ['practitioner'],
      });
      const meta = getPagingData(data, page, limit);
      return { data, meta };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async findAllIncludeDeletes(
    paginationDto: PaginationDto
  ): Promise<{ data: AppointmentSlot[]; meta: PaginationMetadata }> {
    try {
      const { page, limit } = paginationDto;
      const [data, total] = await this.repository.findAndCount({
        skip: (page - 1) * limit,
        take: limit,
        withDeleted: true,
        relations: ['practitioner'],
      });
      const meta = getPagingData(data, page, limit);
      return { data, meta };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async findAllFiltered(
    filteredDto: FilteredAppointmentSlotDto,
    paginationDto: PaginationDto
  ): Promise<{ data: AppointmentSlot[]; meta: PaginationMetadata; msg: string; }> {

    const { day, practitionerId, schedules, page = 1, limit = 10, allDays } = filteredDto;

    // Si no se especifica "day", debe traer todos los días, pero manteniendo la paginación
    const ignoreDayFilter = allDays || !day;

    const qb = this.repository
      .createQueryBuilder('slot')
      .leftJoinAndSelect('slot.schedules', 'schedule')
      .leftJoinAndSelect('slot.practitioner', 'practitioner')
      .where('1=1');

    if (!ignoreDayFilter && day) {
      qb.andWhere('slot.day = :day', { day });
    }

    if (practitionerId) {
      qb.andWhere('practitioner.id = :practitionerId', { practitionerId });
    }

    if (schedules && schedules.length > 0) {
      schedules.forEach((sched, index) => {
        if (sched.openingHour) {
          qb.andWhere(`schedule.openingHour = :openingHour${index}`, {
            [`openingHour${index}`]: sched.openingHour,
          });
        }
        if (sched.closeHour) {
          qb.andWhere(`schedule.closeHour = :closeHour${index}`, {
            [`closeHour${index}`]: sched.closeHour,
          });
        }
      });
    }

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = page;
    const previousPage = currentPage > 1 ? currentPage - 1 : null;
    const nextPage = currentPage < totalPages ? currentPage + 1 : null;

    const meta: PaginationMetadata = {
      totalPages,
      currentPage,
      previousPage,
      nextPage,
      totalItems: total,
    };

    const msg = 'Consulta filtrada exitosa';

    return { data, meta, msg };
  }
}