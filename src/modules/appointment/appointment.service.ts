import {
  BadRequestException,
  Logger,
  Injectable,
  NotFoundException,
  HttpStatus,
  HttpException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorManager } from '../../common/exceptions/error.manager';
import {
  CreateAppointmentDto,
  CreateSocialWorkEnrollmentDto,
  CreateTypeAppointmentDto,
  ReprogramAppointmentDto,
  SerializerAppointmentDto,
  TimeDTO,
  UpdateAppointmentDto
} from '../../domain/dtos';
import {
  Patient,
  Practitioner,
  User,
  Appointment,
  AppointmentSlot,
  SocialWorkEnrollment,
  SocialWork,
  TypeAppointment,
  TypeAppointmentAvailability,
  AppointmentSlotSchedule,
} from '../../domain/entities';
import { AppointmentStatus, Day, Role } from '../../domain/enums';
import 'multer';
import { EntityManager, In, Not, Repository } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { NotificationService } from '../notification/notification.service';
import { AuthService } from '../auth/auth.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { normalizeEmail } from '../../common/util/normalizedEmail';
import moment from 'moment-timezone';
import { envConfig } from '../../config/envs';

@Injectable()
export class AppointmentService {
  private readonly logger = new Logger(AppointmentService.name);
  constructor(
    @InjectRepository(Appointment)
    protected repository: Repository<Appointment>,
    @InjectRepository(TypeAppointment)
    protected typeAppointmentRepository: Repository<TypeAppointment>,
    private readonly notificationService: NotificationService,
    private readonly authService: AuthService,
    @InjectQueue('email') private readonly emailQueue: Queue,
    @InjectQueue('whatsapp') private readonly whatsappQueue: Queue
  ) { }
  
  private readonly timezone = envConfig.APP_TIMEZONE || 'America/Argentina/Buenos_Aires';

  async createTurn(createTurnDto: CreateAppointmentDto): Promise<Appointment> {
    return this.repository.manager.transaction(async (manager) => {
  
      const patient = await this.fetchOrCreatePatient(createTurnDto, manager);
      const practitioner = await this.fetchPractitioner(createTurnDto.practitionerId, manager);

      let { slotId, scheduleId } = createTurnDto;
      
      if (!slotId || !scheduleId) {
        const autoResolved = await this.autoResolveSlotAndSchedule(
          createTurnDto.practitionerId,
          createTurnDto.date,
          createTurnDto.hour,
          manager
        );
        
        if (!autoResolved) {
          throw new BadRequestException(
            `No hay disponibilidad para el practitioner en la fecha ${createTurnDto.date} a las ${createTurnDto.hour}. ` +
            `Verifique que el profesional tenga horarios configurados para ese día.`
          );
        }
        
        slotId = autoResolved.slotId;
        scheduleId = autoResolved.scheduleId;
      }

      const slot = await manager.findOne(AppointmentSlot, {
        where: { id: slotId, deletedAt: null },
        relations: ['practitioner', 'schedules']
      });
      if (!slot) {
        throw new NotFoundException(`AppointmentSlot ${slotId} not found or deleted`);
      }
      //   if (existingUser && existingUser instanceof Patient) {
      //     patient = existingUser;
      //   } else if (existingUser) {
      //     throw new BadRequestException(
      //       `User with email ${createTurnDto.patient.email} or DNI ${createTurnDto.patient.dni} already exists as a different role`
      //     );
      //   } else {
      //     const patientData = {
      //       dni: createTurnDto.patient.dni,
      //       name: createTurnDto.patient.name,
      //       lastName: createTurnDto.patient.lastName,
      //       email: normalizeEmail(createTurnDto.patient.email),
      //       phone: createTurnDto.patient.phone,
      //       documentType: createTurnDto.patient.documentType,
      //       birth: createTurnDto.patient.birth,
      //       gender: createTurnDto.patient.gender,
      //       username: createTurnDto.patient.username,
      //       googleBool: createTurnDto.patient.googleBool,
      //       urlImg: createTurnDto.patient.urlImg,
      //       addresses: createTurnDto.patient.addresses,
      //       // relationship: createTurnDto.patient.relationship,
      //       role: Role.PATIENT
      //     };

      // if (slot.practitioner?.id !== practitioner.id) {
      //   throw new BadRequestException(
      //     `El slot ${slotId} no pertenece al practitioner ${createTurnDto.practitionerId}`
      //   );
      // }

      // Validar que la fecha coincida con el día del slot
      const requestedDay = this.getDayOfWeek(createTurnDto.date);
      if (slot.day !== requestedDay) {
        throw new BadRequestException(
          `El slot seleccionado es para ${slot.day}, no para ${requestedDay}`
        );
      }


      // Obtener schedule y validar que pertenezca a ese slot
      const schedule = await manager.findOneOrFail(AppointmentSlotSchedule, {
        where: { id: scheduleId },
        relations: ['appointmentSlots']
      });
      const scheduleBelongsToSlot = schedule.appointmentSlots?.some((s) => s.id === slot.id);
      if (!scheduleBelongsToSlot) {
        throw new BadRequestException(
          `Schedule ${scheduleId} no pertenece al slot ${slotId}`
        );
      }

      // Validar disponibilidad y solapamiento
      await this.validateAvailabilitySingle(createTurnDto, practitioner, manager);

      // Crear turno
      const newTurn = manager.create(Appointment, {
        date: createTurnDto.date,
        hour: createTurnDto.hour,
        observation: createTurnDto.observation,
        status: createTurnDto.status ?? AppointmentStatus.PENDING,
        patient,
        practitioner,
        slot,
        schedule,
        customDuration: createTurnDto.customDuration ?? slot.durationAppointment,
      });


      if ((createTurnDto as any).typeAppointment) {
        newTurn.typeAppointment = await this.upsertTypeAppointment((createTurnDto as any).typeAppointment, manager);
      }

      const savedTurn = await manager.save(newTurn);
     
      const practitionerName = `${practitioner.name} ${practitioner.lastName}`;

      // Parsear la fecha almacenada (YYYY-MM-DD) para evitar corrimiento de día
      const appointmentMoment = moment
        .tz(savedTurn.date, 'YYYY-MM-DD', this.timezone)
        .locale('es');

      const formattedDate = appointmentMoment.format('dddd DD/MM/YYYY');


      // EMAIL DE CONFIRMACIÓN
      if (patient.email) {
        const subject = 'Turno confirmado - Full Salud';

        const html = this.buildAppointmentHtml({
          patientName: patient.name,
          practitionerName,
          date: formattedDate,
          hour: savedTurn.hour,
          title: 'Turno confirmado',
          intro: 'Tu turno fue agendado. Estos son los detalles:',
          ctaText: 'Ver mi turno',
          // ctaUrl: `${envConfig.FRONTEND_URL}/paciente/turno/detalle/${savedTurn.id}`,
          reason: savedTurn.observation ?? 'Sin especificar',
        });

        await this.emailQueue.add('sendEmail', {
          to: patient.email,
          subject,
          html,
        });
      }

      // WHATSAPP DE CONFIRMACIÓN
      if (patient.phone) {
        // const baseUrl = envConfig.FRONTEND_URL;
        const whatsappMessage =
          `🏥 Full Salud\n` +
          `Hola ${patient.name} 👋\n\n` +
          `Tu turno fue confirmado ✅\n\n` +
          `👨‍⚕️ Profesional: ${practitionerName}\n` +
          `📅 Fecha: ${savedTurn.date}\n` +
          `🕒 Hora: ${savedTurn.hour} hs\n` +
          `${savedTurn.observation ? `📝 Motivo: ${savedTurn.observation}\n\n` : '\n'}` +
          // `Portal: ${baseUrl}\n` +
          `Podés ver los detalles desde el portal.\n` +
          `Te esperamos ✅\n\n` +
          `⚠️ Este es un mensaje automático. Por favor, no responder.`;

        await this.whatsappQueue.add(
          'sendMessage',
          {
            to: patient.phone,
            message: whatsappMessage,
            name: patient.name,
            timeR: 0, // Confirmación inmediata
            doctor: practitionerName,
            fecha: savedTurn.date,
            horaV: savedTurn.hour,
          },
          {
            jobId: `confirmation-${savedTurn.id}-${savedTurn.date}-${savedTurn.hour}`,
            removeOnComplete: true,
            removeOnFail: false,
          },
        );
      }


      return manager.findOneOrFail(Appointment, {
        where: { id: savedTurn.id },
        relations: [
          'patient',
          'patient.socialWorkEnrollment',
          'patient.socialWorkEnrollment.socialWork',
          'practitioner',
          'typeAppointment',
          'practitioner',
          'slot',
          'schedule',
          'typeAppointment',
        ]
      });
    });
  }

  private buildAppointmentHtml(opts: {
    patientName: string;
    practitionerName: string;
    date: string;
    hour: string;
    title: string;
    intro: string;
    ctaText?: string;
    ctaUrl?: string;
    reason?: string;
  }): string {
    const { patientName, practitionerName, date, hour, title, intro, ctaText, ctaUrl, reason } = opts;
    return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
      </head>
      <body style="font-family: Arial, sans-serif; background:#f5f7fb; margin:0; padding:0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f7fb; padding:24px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.06); overflow:hidden;">
                <tr>
                  <td style="background:#0e9f6e; padding:20px; text-align:center;">
                    <h1 style="margin:0; color:#ffffff; font-size:20px;">${title}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 28px; color:#333333;">
                    <p style="margin:0 0 8px 0;">Hola <strong>${patientName}</strong>,</p>
                    <p style="margin:0 0 16px 0;">${intro}</p>
                    <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:12px 16px; margin:16px 0;">
                      <p style="margin:4px 0;"><strong>Profesional:</strong> ${practitionerName}</p>
                      <p style="margin:4px 0;"><strong>Fecha:</strong> ${date}</p>
                      <p style="margin:4px 0;"><strong>Hora:</strong> ${hour} hs</p>
                      ${reason ? `<p style="margin:4px 0;"><strong>Motivo de la consulta:</strong> ${reason}</p>` : ''}
                    </div>
                    ${ctaUrl && ctaText ? `<p style="text-align:center; margin:24px 0;"><a href="${ctaUrl}" style="display:inline-block; padding:12px 20px; background:#0e9f6e; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:bold;">${ctaText}</a></p>` : ''}
                    <hr style="border:none; border-top:1px solid #e5e7eb; margin:20px 0;">
                    <p style="color:#9ca3af; font-size:11px; text-align:center; margin:8px 0;">⚠️ Este es un correo automático generado por el sistema. Por favor, no responder a este mensaje.</p>
                    <p style="margin-top:20px;">ATTE,<br/><strong>Full Salud</strong></p>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f9fafb; padding:16px; text-align:center; color:#6b7280; font-size:12px;">
                    © 2025 Full Salud. Todos los derechos reservados.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`;
  }

  private async upsertTypeAppointment(
    dto: CreateTypeAppointmentDto,
    manager: EntityManager
  ): Promise<TypeAppointment> {
    const existing = await manager.findOne(TypeAppointment, {
      where: { name: dto.name, color: dto.color, deletedAt: null }
    });
    if (existing) return existing;
    const ta = manager.create(TypeAppointment, dto);
    return manager.save(ta);
  }

  private async autoResolveSlotAndSchedule(
    practitionerId: string,
    date: string,
    hour: string,
    manager: EntityManager
  ): Promise<{ slotId: string; scheduleId: string } | null> {
    try {
      // Obtener el día de la semana para la fecha dada
      const dayEnum = this.getDayOfWeek(date);

      // Buscar slots del practitioner para ese día
      const slots = await manager.find(AppointmentSlot, {
        where: {
          practitioner: { id: practitionerId },
          day: dayEnum,
          unavailable: false,
          deletedAt: null
        },
        relations: ['schedules']
      });

      if (!slots.length) {
        return null; // No hay slots disponibles para este día
      }

      // Buscar el schedule que contenga la hora especificada
      for (const slot of slots) {
        for (const schedule of slot.schedules || []) {
          // Verificar si la hora está dentro del rango del schedule
          if (hour >= schedule.openingHour && hour < schedule.closeHour) {
            return {
              slotId: slot.id,
              scheduleId: schedule.id
            };
          }
        }
      }

      return null; // No se encontró ningún schedule que contenga la hora especificada
    } catch (error) {
      this.logger.error(`Error auto-resolving slot and schedule: ${(error as Error).message}`);
      return null;
    }
  }


  private async validateAvailabilitySingle(
    dto: CreateAppointmentDto,
    practitioner: Practitioner,
    manager: EntityManager
  ) {
    const day = this.getDayOfWeek(dto.date);

    // Traer schedules para este médico y día
    const schedules = await manager.find(AppointmentSlotSchedule, {
      relations: ['appointmentSlots'],
      where: {
        appointmentSlots: {
          practitioner: { id: practitioner.id },
          day
        }
      }
    });

    if (!schedules.length) {
      throw new BadRequestException(`Practitioner not available on ${day}`);
    }

    const toMinutes = (hhmm: string) => {
      const [h, m] = hhmm.split(':').map(Number);
      return h * 60 + (m || 0);
    };
    const pad = (n: number) => `${n}`.padStart(2, '0');
    const fmt = (min: number) => `${pad(Math.floor(min/60))}:${pad(min%60)}`;

    const slotForDuration = await manager.findOne(AppointmentSlot, {
      where: { id: dto.slotId, deletedAt: null },
      select: ['id', 'durationAppointment'] as any
    });

    const effectiveDuration =
      typeof dto.customDuration === 'number' && dto.customDuration >= 0
        ? Math.floor(dto.customDuration)
        : (slotForDuration?.durationAppointment ?? practitioner.durationAppointment ?? 30);

    // Normalización duración turno
    dto.customDuration = effectiveDuration;

    // Validaciones de fecha/hora
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.date) || !/^\d{2}:\d{2}$/.test(dto.hour)) {
      throw new BadRequestException('Invalid date or time. ');
    }
    const startsAtTz = moment.tz(`${dto.date} ${dto.hour}`, 'YYYY-MM-DD HH:mm', this.timezone);
    const nowTz = moment.tz(this.timezone);
    if (!startsAtTz.isValid()) {
      throw new BadRequestException('Invalid date or time. ');
    }
    if (startsAtTz.isBefore(nowTz)) {
      throw new BadRequestException('Cannot create appointments in the past. ');
    }

    const startMin = toMinutes(dto.hour);
    const endMin = startMin + effectiveDuration;

    // Validar que el turno encaje completo en alguna franja 
    const fitsAnySchedule = schedules.some((s) => {
      const openMin = toMinutes(`${(s as any).openingHour}`);
      const closeMin = toMinutes(`${(s as any).closeHour}`);
      return startMin >= openMin && endMin <= closeMin;
    });

    if (!fitsAnySchedule) {
      const ranges = schedules
        .map((s) => `${`${(s as any).openingHour}`.slice(0,5)}–${`${(s as any).closeHour}`.slice(0,5)}`)
        .join(', ');
      throw new BadRequestException(
        `The appointment ${fmt(startMin)} (duration ${effectiveDuration} min) must be within the time range: ${ranges}`
      );
    }

    // Verifica que no se superpongan otros turnos
    const existing = await manager.find(Appointment, {
      where: {
        practitioner: { id: practitioner.id },
        date: dto.date,
        status: Not(In([
          AppointmentStatus.CANCELLED,
        ]))
      },
      select: ['id', 'hour', 'customDuration', 'status'] as any
    });

    const overlaps = existing.find((a) => {
      const aStart = toMinutes(a.hour);
      const aDur =
        (typeof a.customDuration === 'number' && a.customDuration > 0)
          ? a.customDuration
          : (slotForDuration?.durationAppointment ?? practitioner.durationAppointment ?? 30);
      const aEnd = aStart + aDur;

      return startMin < aEnd && endMin > aStart;
    });

    if (overlaps) {
      throw new BadRequestException(
        `There is already an appointment within the time range ${fmt(startMin)}–${fmt(endMin)}. `
      );
    }
  }

  getDayOfWeek(dateStr: string): Day {
    const date = new Date(`${dateStr}T00:00:00`);

    const dayNumber = date.getDay();

    const dayMap: { [key: number]: Day } = {
      0: Day.SUNDAY,
      1: Day.MONDAY,
      2: Day.TUESDAY,
      3: Day.WEDNESDAY,
      4: Day.THURSDAY,
      5: Day.FRIDAY,
      6: Day.SATURDAY
    };

    return dayMap[dayNumber];
  }

  async getOne(id: string): Promise<Appointment> {
    try {
      const turn = await this.repository.findOne({
        where: { id, deletedAt: null },
        relations: [
          'patient',
          'patient.socialWorkEnrollment',
          'patient.socialWorkEnrollment.socialWork',
          'practitioner',
          'slot',
          'typeAppointment'
        ]
      });

      if (!turn) {
        throw new ErrorManager("Turn not found", HttpStatus.NO_CONTENT);
      }

      return turn;
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

    async getAppointmentTypeStats(
    practitionerId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    typeStats: { name: string; count: number; color: string }[];
    period: { start: string; end: string };
  }> {
    try {
      const today = moment.tz(this.timezone);
      const defaultStart = today.clone().subtract(7, 'days');

      // Usar fechas provistas o por defecto
      const parsedStart = startDate
        ? moment.tz(startDate, 'YYYY-MM-DD', true, this.timezone)
        : defaultStart;

      const parsedEnd = endDate
        ? moment.tz(endDate, 'YYYY-MM-DD', true, this.timezone)
        : today;
    
      if (!parsedStart.isValid() || !parsedEnd.isValid()) {
        throw new Error('Invalid date format. Use YYYY-MM-DD.');
      }

      if (parsedStart.isAfter(parsedEnd)) {
        throw new Error('Start date cannot be after end date.');
      }

      const formattedStartDate = parsedStart.format('YYYY-MM-DD');
      const formattedEndDate = parsedEnd.format('YYYY-MM-DD');

      const queryBuilder = this.repository
        .createQueryBuilder('appointment')
        .leftJoin('appointment.practitioner', 'practitioner')
        .leftJoin('appointment.typeAppointment', 'typeAppointment')
        .select([
          'typeAppointment.name as name',
          'typeAppointment.color as color',
          'COUNT(appointment.id) as count'
        ])
        .andWhere('appointment.date BETWEEN :startDate AND :endDate', {
          startDate: formattedStartDate,
          endDate: formattedEndDate
        })
        .andWhere('appointment.deletedAt IS NULL')
        .groupBy('typeAppointment.name, typeAppointment.color');

      // Solo filtrar por practitioner si se proporciona el ID
      if (practitionerId) {
        queryBuilder.andWhere('practitioner.id = :practitionerId', { practitionerId });
      }

      const stats = await queryBuilder.getRawMany();

      // Si no hay estadísticas, devolver array vacío en lugar de error
      const typeStats = stats.length > 0
        ? stats.map(stat => ({
          name: stat.name || 'Sin tipo',
          count: parseInt(stat.count),
          color: stat.color || '#808080'
        }))
        : []; // Array vacío cuando no hay datos

      return {
        typeStats,
        period: {
          start: formattedStartDate,
          end: formattedEndDate
        }
      };
    } catch (error) {
      this.logger.error(`Error getting appointment type stats: ${error}`);
      throw new ErrorManager((error as Error).message, 400);
    }
  }

  async getAll(
    page: number = 1,
    limit: number = 10
  ): Promise<{
    turns: Appointment[];
    total: number;
    page: number;
    limit: number;
    previousPage: number | null;
  }> {
    try {
      const [data, total] = await this.repository.findAndCount({
        where: { deletedAt: null },
        relations: ['patient', 'practitioner'],
        skip: (page - 1) * limit,
        take: limit
      });

      if (!data.length) {
        throw new ErrorManager("Turn not found", HttpStatus.NO_CONTENT);
      }

      return {
        turns: data,
        total,
        page,
        limit,
        previousPage: page > 1 ? page - 1 : null
      };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  // Turnos de un especialista por ID, por estado PENDING, APPROVED, NO_SHOW
  async getTurnsBySpecialist(specialistId: string): Promise<Appointment[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const sixMonthsLater = new Date();
      sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
      sixMonthsLater.setHours(23, 59, 59, 999); // Hasta 6 meses a partir de hoy

      // Formatear fechas como strings en formato YYYY-MM-DD para comparación
      const todayStr = today.toISOString().split('T')[0];
      const sixMonthsLaterStr = sixMonthsLater.toISOString().split('T')[0];

      const turns = await this.repository
        .createQueryBuilder('appointment')
        .leftJoinAndSelect('appointment.patient', 'patient')
        .leftJoinAndSelect('patient.socialWorkEnrollment', 'socialWorkEnrollment')
        .leftJoinAndSelect('socialWorkEnrollment.socialWork', 'socialWork')
        .leftJoinAndSelect('appointment.practitioner', 'practitioner')
        .leftJoinAndSelect('appointment.typeAppointment', 'typeAppointment')
        .where('practitioner.id = :specialistId', { specialistId })
        .andWhere('appointment.status IN (:...statuses)', {
          statuses: [
            AppointmentStatus.PENDING,
            AppointmentStatus.APPROVED,
            AppointmentStatus.NO_SHOW
          ]
        })
        .andWhere('appointment.deletedAt IS NULL')
        .andWhere('appointment.date BETWEEN :today AND :sixMonthsLater', {
          today: todayStr,
          sixMonthsLater: sixMonthsLaterStr
        })
        .orderBy('appointment.date', 'ASC')
        .addOrderBy('appointment.hour', 'ASC')
        .getMany();

        if (!turns.length) {
          throw new HttpException(
            `No turns found for specialist with ID ${specialistId} in the next 6 months`,
            HttpStatus.NO_CONTENT
          );
        }

      return turns;
    } catch (error) {
      // Permitir que las excepciones con código 204 se propaguen
      if (error instanceof HttpException && error.getStatus() === HttpStatus.NO_CONTENT) {
        throw error;
      }
      
      throw new BadRequestException(
        `An error occurred while fetching appointments for specialist with ID ${specialistId}: ${(error as Error).message}`
      );
    }
  }

  async getTurnStatsForSpecialist(
    specialistId?: string,
    period?: 'week' | 'month' | 'year'
  ): Promise<{
    completedStats: { count: number; percentage: number };
    canceledStats: { count: number; percentage: number };
    totalTurns: number;
    period?: { start: string; end: string };
  }> {
    try {
      const queryBuilder = this.repository
        .createQueryBuilder('appointment')
        .leftJoin('appointment.practitioner', 'practitioner')
        .select('appointment.status', 'status')
        .addSelect('COUNT(appointment.id)', 'count')
        .where('appointment.status IN (:...statuses)', {
          statuses: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, AppointmentStatus.RESCHEDULED]
        })
        .andWhere('appointment.deletedAt IS NULL');

      // Solo filtrar por practitioner si se proporciona el ID
      if (specialistId) {
        queryBuilder.andWhere('practitioner.id = :specialistId', { specialistId });
      }

      let startDate: string;
      let endDate: string;

      if (period) {
        const today = new Date();
        endDate = today.toISOString().split('T')[0]; // Fecha actual

        if (period === 'week') {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          startDate = weekAgo.toISOString().split('T')[0];
        } else if (period === 'month') {
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          startDate = monthAgo.toISOString().split('T')[0];
        } else if (period === 'year') {
          const yearAgo = new Date();
          yearAgo.setFullYear(yearAgo.getFullYear() - 1);
          startDate = yearAgo.toISOString().split('T')[0];
        }

        const stats = await queryBuilder
          .groupBy('appointment.status')
          .getRawMany();

        if (stats.length === 0) {
          throw new ErrorManager(`No completed or cancelled turns found for specialist with ID ${specialistId}${period ? ` in the last ${period}` : ''}`, HttpStatus.NO_CONTENT);
        }

        let completedCount = 0;
        let cancelledCount = 0;

        stats.forEach((stat) => {
          if (stat.status === AppointmentStatus.COMPLETED) {
            completedCount = parseInt(stat.count);
          } else if (stat.status === AppointmentStatus.CANCELLED) {
            cancelledCount = parseInt(stat.count);
          }
        });

        const totalTurns = completedCount + cancelledCount;

        const completedPercentage =
          totalTurns > 0 ? (completedCount / totalTurns) * 100 : 0;
        const canceledPercentage =
          totalTurns > 0 ? (cancelledCount / totalTurns) * 100 : 0;

        const result = {
          completedStats: {
            count: completedCount,
            percentage: completedPercentage
          },
          canceledStats: {
            count: cancelledCount,
            percentage: canceledPercentage
          },
          totalTurns
        };

        if (period) {
          return {
            ...result,
            period: {
              start: startDate,
              end: endDate
            }
          };
        }

        return result;
      }
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async getTurnsByDniAndPractitioner(
    dni: string,
    practitionerId: string
  ): Promise<Appointment[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayStr = today.toISOString().split('T')[0];

      const turns = await this.repository
        .createQueryBuilder('appointment')
        .leftJoinAndSelect('appointment.patient', 'patient')
        .leftJoinAndSelect('appointment.practitioner', 'practitioner')
        .where('patient.dni = :dni', { dni })
        .andWhere('practitioner.id = :practitionerId', { practitionerId })
        .andWhere('appointment.date >= :today', { today: todayStr })
        .andWhere('appointment.deletedAt IS NULL')
        .orderBy('appointment.date', 'ASC')
        .addOrderBy('appointment.hour', 'ASC')
        .getMany();

      if (!turns.length) {
        throw new ErrorManager(`No turns found for patient with DNI ${dni} and practitioner ID ${practitionerId} from today onwards`, HttpStatus.NO_CONTENT);
      }

      return turns;
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async getTurnsBySpecialistAll(
    specialistId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    turns: Appointment[];
    total: number;
    page: number;
    limit: number;
    previousPage: number | null;
  }> {
    try {
      const [data, total] = await this.repository.findAndCount({
        where: {
          practitioner: { id: specialistId },
          status: Not(AppointmentStatus.NO_SHOW),
          deletedAt: null
        },
        relations: ['patient', 'practitioner', 'typeAppointment'],
        skip: (page - 1) * limit,
        take: limit
      });

      if (!data.length) {
        throw new ErrorManager(`No turns found for specialist with ID ${specialistId}`, HttpStatus.NO_CONTENT);
      }

      return {
        turns: data,
        total,
        page,
        limit,
        previousPage: page > 1 ? page - 1 : null
      };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  // Turnos de un paciente por ID
  async getTurnsByPatient(
    patientId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    turns: Appointment[];
    total: number;
    page: number;
    limit: number;
    previousPage: number | null;
  }> {
    try {
      const [data, total] = await this.repository.findAndCount({
        where: {
          patient: { id: patientId },
          status: In([
            AppointmentStatus.PENDING,
            AppointmentStatus.APPROVED,
            AppointmentStatus.NO_SHOW
          ]),
          deletedAt: null
        },
        relations: ['patient', 'practitioner', 'typeAppointment'],
        skip: (page - 1) * limit,
        take: limit
      });

      if (!data.length) {
        throw new ErrorManager(`No turns found for patient with ID ${patientId}`, HttpStatus.NO_CONTENT);
      }

      return {
        turns: data,
        total,
        page,
        limit,
        previousPage: page > 1 ? page - 1 : null
      };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async getTurnsByPatientAll(
    patientId: string,
    practitionerName?: string,
    status?: AppointmentStatus,
    professionName?: string,
    startDate?: string,
    endDate?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    turns: Appointment[];
    total: number;
    page: number;
    limit: number;
    previousPage: number | null;
  }> {
    try {
      // obtener y validar fechas
      const today = moment.tz(this.timezone);
      const defaultStart = today.clone().subtract(7, 'days');

      const parsedStart = startDate
        ? moment.tz(startDate, 'YYYY-MM-DD', true, this.timezone)
        : moment('1900-01-01');  

      const parsedEnd = endDate
        ? moment.tz(endDate, 'YYYY-MM-DD', true, this.timezone)
        : moment('2999-12-31');  

      if (!parsedStart.isValid() || !parsedEnd.isValid()) {
        throw new Error('Invalid date format. Use YYYY-MM-DD.');
      }

      if (parsedStart.isAfter(parsedEnd)) {
        throw new Error('Start date cannot be after end date.');
      }

      const formattedStartDate = parsedStart.format('YYYY-MM-DD');
      const formattedEndDate = parsedEnd.format('YYYY-MM-DD');

      // obtener appointment
      const query = this.repository
        .createQueryBuilder('appointment')
        .leftJoinAndSelect('appointment.patient', 'patient')
        .leftJoinAndSelect('appointment.practitioner', 'practitioner')
        .leftJoinAndSelect('practitioner.professionalDegree', 'professionalDegree')
        .leftJoinAndSelect('appointment.typeAppointment', 'typeAppointment')
        .where('patient.id = :patientId', { patientId })
        .andWhere('appointment.deletedAt IS NULL')
        .andWhere('appointment.date BETWEEN :start AND :end', {
          start: formattedStartDate,
          end: formattedEndDate,
        })
        .distinct(true);
      
      // filtro por estados del appointment
      if (status !== undefined && status !== null) {
        query.andWhere('appointment.status = :status', { status: status });
      } else {
        query.andWhere('appointment.status <> :noShow', { noShow: AppointmentStatus.NO_SHOW });
      }
    
      // filtro por nombre o apellido (o ambos) del practitioner, sin distinguir mayúsculas minúsculas o tildes
      if (practitionerName?.trim()) {
        query.andWhere(
          `
            TRANSLATE(
              LOWER(CONCAT(practitioner.name, ' ', practitioner.lastName)),
                'áéíóúÁÉÍÓÚÜü',
                'aeiouaeiouuu') 
              LIKE CONCAT('%',
                TRANSLATE(LOWER(:pract), 'áéíóúÁÉÍÓÚÜü', 'aeiouaeiouuu'),
            '%')
          `,
          { pract: `%${practitionerName.trim().toLowerCase()}%` }
        );
      }

      // filtro por nombre de professionalDegree del practitioner, sin distinguir mayúsculas minúsculas o tildes
      if (professionName?.trim()) {
        query.andWhere(
          `
          (
            TRANSLATE(LOWER(professionalDegree.professionalDegree),
              'áéíóúÁÉÍÓÚÜü',
              'aeiouaeiouuu'
            ) LIKE TRANSLATE( :prof, 'áéíóúÁÉÍÓÚÜü', 'aeiouaeiouuu' )
          )
          `,
          { prof: `%${professionName.trim().toLowerCase()}%` } 
        );
      }

      const [data, total] = await query
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      return {
        turns: data,
        total,
        page,
        limit,
        previousPage: page > 1 ? page - 1 : null
      };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  //Obtener turnos completados por el ID del paciente (historial).
  async getCompletedTurnsByPatient(
    patientId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    turns: Appointment[];
    total: number;
    page: number;
    limit: number;
    previousPage: number | null;
  }> {
    try {
      const [data, total] = await this.repository.findAndCount({
        where: {
          patient: { id: patientId },
          status: AppointmentStatus.COMPLETED,
          deletedAt: null
        },
        relations: ['patient', 'practitioner'],
        skip: (page - 1) * limit,
        take: limit
      });

      if (!data.length) {
        throw new ErrorManager(
          `No completed turns found for patient ID ${patientId}`,
          HttpStatus.NO_CONTENT
        );
      }

      return {
        total,
        page,
        limit,
        previousPage: page > 1 ? page - 1 : null,
        turns: data
      };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  //Soft delete para eliminar un turno.
  async removeTurn(id: string, reprog: boolean): Promise<{ message: string }> {
    try {
      const turn = await this.repository.findOne({
        where: { id, deletedAt: null }
      });

      if (!turn) {
        throw new ErrorManager(`Turn with ID ${id} not found`, HttpStatus.NO_CONTENT);
      }

      // this.cancelQueue(turn.id);

      const deletedTurn = await this.repository.softRemove(turn);

      if (reprog === true) {
        deletedTurn.reprogrammed = true;
        await this.repository.save(deletedTurn);
      }

      const { id: NewId, date, hour, ...rest } = deletedTurn;

      return {
        message: `Turn with ID: ${NewId} for ${date} at ${hour} deleted successfully`
      };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  //Recover para restaurar un turno eliminado.
  async recoverTurn(id: string): Promise<Appointment> {
    try {
      const turn = await this.repository.findOne({
        withDeleted: true,
        where: { id }
      });

      if (!turn) {
        throw new ErrorManager(`Turn with ID ${id} not found`, HttpStatus.NO_CONTENT);
      }

      await this.repository.recover(turn);
      return turn;
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async updateTurn(
    id: string,
    updateTurnDto: UpdateAppointmentDto
  ): Promise<Appointment> {
    // Verifica primero si el turno existe
    const turn = await this.repository.findOne({
      where: { id, deletedAt: null },
      relations: ['patient', 'practitioner'] // Asegúrate de cargar relaciones necesarias
    });

    if (!turn) {
      throw new ErrorManager(`Turn with ID ${id} not found`, HttpStatus.NO_CONTENT);
    }

    // Actualiza solo los campos permitidos (evita sobreescribir relaciones directamente)
    const allowedFields = {
      // date: updateTurnDto.date,
      // hour: updateTurnDto.hour,
      // observation: updateTurnDto.observation,
      status: updateTurnDto.status
    };

    Object.assign(turn, allowedFields);

    try {
      // Guarda los cambios
      const updatedTurn = await this.repository.save(turn);

      // Notificaciones (si es necesario)
      this.logger.log('getting user that cancel by id: ', updateTurnDto.userId);
      const loggedUser = await this.authService.getUserById(
        updateTurnDto.userId
      );
      this.logger.log(loggedUser.role);
      if (updateTurnDto.status === AppointmentStatus.CANCELLED) {
        if (loggedUser.role === Role.PRACTITIONER) {
          await this.notificationService.createNotification({
            patientId: turn.patient.id,
            read: false,
            title: 'Cancelación de Turno',
            text: `Se ha cancelado el turno para el ${turn.date} a las ${turn.hour}`
          });
        } else {
          this.logger.log('practitioner id: ', turn.practitioner.id),
            await this.notificationService.createNotification({
              practitionerId: turn.practitioner.id,
              read: false,
              title: 'Cancelación de Turno',
              text: `Se ha cancelado el turno para el ${turn.date} a las ${turn.hour}`
            });
        }
      }

      return updatedTurn;
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  // Verificar superposición de turnos
  async checkOverlapAndUpdateTurn(
    id: string,
    updateTurnDto: UpdateAppointmentDto
  ): Promise<SerializerAppointmentDto> {
    try {
      const { date, hour } = updateTurnDto;

      // Validar que la fecha y hora estén presentes
      if (!date || !hour) {
        throw new BadRequestException('Date and hour are required');
      }

      // Validar el formato de la fecha (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
      }

      // Validar el formato de la hora (HH:MM)
      const hourRegex = /^\d{2}:\d{2}$/;
      if (!hourRegex.test(hour)) {
        throw new BadRequestException('Invalid hour format. Use HH:MM');
      }

      // Obtener el turno existente
      const existingTurn = await this.repository.findOne({
        where: { id, deletedAt: null },
        relations: ['practitioner']
      });

      if (!existingTurn) {
        throw new NotFoundException(`Turn with ID ${id} not found`);
      }

      // Verificar si hay superposición con otros turnos
      const overlappingTurn = await this.repository
        .createQueryBuilder('appointment')
        .where('appointment.date = :date', { date })
        .andWhere('appointment.hour = :hour', { hour })
        .andWhere('appointment.id != :id', { id }) // Excluir el turno actual
        .andWhere('appointment.deletedAt IS NULL')
        .getOne();

      if (overlappingTurn) {
        throw new BadRequestException(
          'The provided date and hour overlap with an existing turn'
        );
      }

      // Actualizar el turno si no hay superposición
      Object.assign(existingTurn, updateTurnDto);
      const updatedTurn = await this.repository.save(existingTurn);

      //create notification to user segun corresponda
      //check user rol to send notification
      await this.notificationService.createNotification({
        userId: updatedTurn.patient.id,
        read: false,
        title: 'Cancelacion de Turno',
        text: `Se ha cancelado un nuevo turno para el ${updateTurnDto.date} a las ${updateTurnDto.hour}`
      });

      //notification to practitioner
      await this.notificationService.createNotification({
        userId: updateTurnDto.practitionerId,
        read: false,
        title: 'Nuevo Turno',
        text: `Se ha creado un nuevo turno para el ${updateTurnDto.date} a las ${updateTurnDto.hour}`
      });
      

      return plainToClass(SerializerAppointmentDto, updatedTurn, {
        excludeExtraneousValues: true
      });
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  private async validateTurn(
    hour: string,
    existingTurns: TimeDTO[],
    consultationTime: string
  ): Promise<boolean> {
    if (!existingTurns || existingTurns.length === 0) {
      return true;
    }

    const newStart = this.convertTimeToSeconds(hour);
    const newDuration = this.convertTimeToSeconds(consultationTime);
    const newEnd = newStart + newDuration;

    for (const turn of existingTurns) {
      const start = this.convertTimeToSeconds(turn.appointment_hour);
      const duration = this.convertTimeToSeconds(turn.consultation_time);
      const end = start + duration;

      // Lógica correcta de solapamiento: dos intervalos se solapan si: el inicio del nuevo es antes del fin del existente Y el fin del nuevo es después del inicio del existente
      const overlaps = newStart < end && newEnd > start;

      if (overlaps) {
        throw new BadRequestException(
          `El turno se superpone con otro existente que va desde ${turn.appointment_hour} hasta ${this.formatTime(end)}`
        );
      }
    }

    return true;
  }

  // Formatear segundos a hora
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  private convertTimeToSeconds(time: any): number {
    // Si time es undefined o null, devolvemos 0 o lanzamos un error
    if (time === undefined || time === null) {
      return 0;
      // O podrías lanzar un error:
      // throw new Error('Time parameter is required');
    }

    // Si time ya es un número, asumimos que son segundos y lo devolvemos
    if (typeof time === 'number') {
      return time;
    }

    // Convertimos a string por si acaso es un número como string u otro tipo
    const timeStr = String(time);

    // Si no contiene ':', asumimos que son segundos totales
    if (!timeStr.includes(':')) {
      return parseInt(timeStr, 10) || 0;
    }

    // Manejar formatos "HH:MM" y "HH:MM:SS"
    const parts = timeStr.split(':');
    if (parts.length < 2 || parts.length > 3) {
      throw new Error(
        `Invalid time format: ${timeStr}. Expected "HH:MM" or "HH:MM:SS"`
      );
    }

    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    const seconds = parts.length === 3 ? parseInt(parts[2], 10) || 0 : 0;

    return hours * 3600 + minutes * 60 + seconds;
  }

  async reprogramTurn(id: string, dto: ReprogramAppointmentDto): Promise<Appointment> {
    return this.repository.manager.transaction(async (manager) => {
      const turn = await manager.findOne(Appointment, {
        where: { id, deletedAt: null },
        relations: ['patient', 'practitioner', 'slot', 'schedule', 'typeAppointment']
      });
      if (!turn) {
        throw new NotFoundException(`Turn with ID ${id} not found`);
      }

      // Fetch new slot and validate it belongs to same practitioner
      const slot = await manager.findOne(AppointmentSlot, {
        where: { id: dto.slotId, deletedAt: null },
        relations: ['practitioner', 'schedules']
      });
      if (!slot) {
        throw new NotFoundException(`AppointmentSlot ${dto.slotId} not found or deleted`);
      }
      if (!slot.practitioner || slot.practitioner.id !== turn.practitioner.id) {
        throw new BadRequestException('El slot seleccionado no corresponde al mismo profesional del turno');
      }

      // Validate date matches slot day
      const requestedDay = this.getDayOfWeek(dto.date);
      if (slot.day !== requestedDay) {
        throw new BadRequestException(`El slot seleccionado es para ${slot.day}, no para ${requestedDay}`);
      }

      // Fetch schedule and validate it belongs to the slot
      const schedule = await manager.findOne(AppointmentSlotSchedule, {
        where: { id: dto.scheduleId },
        relations: ['appointmentSlots']
      });
      if (!schedule) {
        throw new NotFoundException(`Schedule ${dto.scheduleId} not found`);
      }
      const scheduleBelongsToSlot = schedule.appointmentSlots?.some((s) => s.id === slot.id);
      if (!scheduleBelongsToSlot) {
        throw new BadRequestException(`Schedule ${dto.scheduleId} no pertenece al slot ${dto.slotId}`);
      }

      // Validar disponibilidad y solapamiento
      // Crear un DTO temporal compatible con CreateAppointmentDto para la validación
      const validationDto: CreateAppointmentDto = {
        date: dto.date,
        hour: dto.hour,
        slotId: dto.slotId,
        scheduleId: dto.scheduleId,
        practitionerId: turn.practitioner.id,
        customDuration: (turn as any).customDuration,
      } as CreateAppointmentDto;

      // Excluir el turno actual temporalmente para evitar falso positivo de solapamiento
      const tempDeletedAt = turn.deletedAt;
      turn.deletedAt = new Date(); // Marcar temporalmente como eliminado
      await manager.save(turn);

      try {
        // Validar disponibilidad (incluye validación de horarios y solapamientos)
        await this.validateAvailabilitySingle(validationDto, turn.practitioner, manager);
      } finally {
        // Restaurar el estado original
        turn.deletedAt = tempDeletedAt;
        await manager.save(turn);
      }

      // Update entity
      turn.date = dto.date;
      turn.hour = dto.hour;
      turn.slot = slot;
      turn.schedule = schedule;
      if (dto.observation) turn.observation = dto.observation;
      (turn as any).reprogrammed = true;

      const saved = await manager.save(turn);
      return manager.findOneOrFail(Appointment, {
        where: { id: saved.id },
        relations: [
          'patient',
          'patient.socialWorkEnrollment',
          'patient.socialWorkEnrollment.socialWork',
          'practitioner',
          'slot',
          'schedule',
          'typeAppointment',
        ]
      });
    });
  }

  private async fetchOrCreatePatient(dto: CreateAppointmentDto, manager: EntityManager): Promise<Patient> {
    // Validate that exactly one of patientId or patient is provided
    if (!dto.patientId && !dto.patient) {
      throw new BadRequestException('Either patientId or patient data is required');
    }
    
    if (dto.patientId && dto.patient) {
      throw new BadRequestException('Cannot provide both patientId and patient data. Use either one or the other.');
    }

    // If patientId is provided, fetch existing patient
    if (dto.patientId) {
      const patient = await manager.findOne(Patient, { where: { id: dto.patientId } });
      if (!patient) {
        throw new NotFoundException(`Patient ${dto.patientId} not found`);
      }
      return patient;
    }

    // If patient object is provided, create or find existing patient
    if (dto.patient) {
      const { dni, email, socialWorkEnrollment, ...patientFields } = dto.patient;
      
      // Check if patient already exists by DNI or email
      const existingPatient = await manager.findOne(Patient, {
        where: [
          { dni },
          { email: normalizeEmail(email) }
        ]
      });

      if (existingPatient) {
        // Patient already exists, return the existing one
        return existingPatient;
      }

      // Create new patient WITHOUT password
      const patientData: any = {
        ...patientFields,
        dni,
        email: normalizeEmail(email),
        role: Role.PATIENT,
        activated: false // Set as not activated initially
      };

      // Eliminar lógica de contraseña temporal: no asignar password ni hashearlo

      // Handle social work enrollment if provided
      if (socialWorkEnrollment) {
        if (typeof socialWorkEnrollment === 'string') {
          // It's an ID, fetch the enrollment
          const enrollment = await manager.findOne(SocialWorkEnrollment, {
            where: { id: socialWorkEnrollment }
          });
          if (!enrollment) {
            throw new NotFoundException(`SocialWorkEnrollment ${socialWorkEnrollment} not found`);
          }
          patientData.socialWorkEnrollment = enrollment;
        } else {
          // It's an object, create new enrollment
          const enrollmentData = socialWorkEnrollment as CreateSocialWorkEnrollmentDto;
          if (enrollmentData.socialWork?.id) {
            const socialWork = await manager.findOne(SocialWork, {
              where: { id: enrollmentData.socialWork.id }
            });
            if (!socialWork) {
              throw new NotFoundException(`SocialWork ${enrollmentData.socialWork.id} not found`);
            }
            
            const newEnrollment = manager.create(SocialWorkEnrollment, {
              ...enrollmentData,
              socialWork
            });
            patientData.socialWorkEnrollment = await manager.save(newEnrollment);
          }
        }
      }

      const newPatient = manager.create(Patient, patientData);
      return await manager.save(newPatient);
    }

    throw new BadRequestException('Invalid patient data provided');
  }

  private async fetchPractitioner(
    id: string,
    manager: EntityManager
  ): Promise<Practitioner> {
    const p = await manager.findOne(Practitioner, { where: { id } });
    if (!p) throw new NotFoundException(`Practitioner ${id} not found`);
    return p;
  }

  async getAvailableAppointments(
    practitionerId: string,
    date?: string,
    typeAppointmentId?: string
  ): Promise<{
    date: string;
    available: { time: string; slotId: string; scheduleId: string; isOvertime?: boolean }[];
    booked: string[] ;
  }> {
    try {
      // Fecha de consulta (por defecto hoy)
      const todayTz = moment.tz(this.timezone);
      const selectedDate = date
        ? moment.tz(date, 'YYYY-MM-DD', true, this.timezone)
        : todayTz.clone();

      if (!selectedDate.isValid()) {
        throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
      }

      const dateStr = selectedDate.format('YYYY-MM-DD');
      const dayEnum = this.getDayOfWeek(dateStr);

      // practitioner exists
      const practitioner = await this.repository.manager.findOne(Practitioner, { where: { id: practitionerId } });
      if (!practitioner) {
        throw new NotFoundException(`Practitioner ${practitionerId} not found`);
      }

      let typeAvailability: TypeAppointmentAvailability | undefined = undefined;

      if (typeAppointmentId) {
        const typeAppointmetRepo = this.repository.manager.getRepository(TypeAppointment);
        const typeAppointment = await typeAppointmetRepo.findOne({
          where: { id: typeAppointmentId },
          relations: ['availabilities']
        });

        if (!typeAppointment) {
          throw new NotFoundException(`TypeAppointment ${typeAppointmentId} not found`);
        }

        // Si availabilities es null o está vacío, el tipo de turno está disponible en todos los horarios
        const dayAvailabilities = typeAppointment.availabilities;
        
        if (dayAvailabilities && dayAvailabilities.length > 0) {
          // Solo aplicar restricciones si existen availabilities configuradas
          typeAvailability = dayAvailabilities.find(a => a.day === dayEnum);

          // Si hay availabilities pero no para este día específico, retorna vacío
          if (!typeAvailability) {
            return { date: dateStr, available: [], booked: [] };
          }
        }
        // Si dayAvailabilities es null o vacío, typeAvailability queda undefined y sigue el flujo normal
      }

      const slotRepo = this.repository.manager.getRepository(AppointmentSlot);
      // Obtener slots activos para este practitioner y día
      const slots = await slotRepo.find({
        where: {
          practitioner: { id: practitionerId },
          day: dayEnum,
          unavailable: false
        },
        relations: ['schedules']
      });

      // Turnos existentes para el día
      const rawTurns = await this.repository
        .createQueryBuilder('a')
        .innerJoin('a.practitioner', 'p')
        .select([
          'a.hour AS appointment_hour',
          'COALESCE(a.custom_duration * 60, p.durationAppointment * 60) AS consultation_time'
        ])
        .where('a.date = :date', { date: dateStr })
        .andWhere('a.deletedAt IS NULL')
        .andWhere('a.status != :cancelled', { cancelled: AppointmentStatus.CANCELLED })
        .andWhere('p.id = :pid', { pid: practitionerId })
        .getRawMany<{ appointment_hour: string; consultation_time: string }>();
      
      const existingTurns: TimeDTO[] = rawTurns.map(r => ({
        appointment_hour: r.appointment_hour,
        consultation_time: r.consultation_time
      }));

      // Build booked times list (HH:MM)
      const booked: string[] = rawTurns.map(r => this.formatTime(this.convertTimeToSeconds(r.appointment_hour)));
      const available: { time: string; slotId: string; scheduleId: string; isOvertime?: boolean }[] = [];

      const nowTz = moment.tz(this.timezone);

      for (const slot of slots) {
        const stepSeconds = Math.max(1, Math.round((slot.durationAppointment || practitioner.durationAppointment || 30) * 60));
        
        for (const schedule of slot.schedules || []) {
          let openSec = this.convertTimeToSeconds(schedule.openingHour);
          let closeSec = this.convertTimeToSeconds(schedule.closeHour);
          const overtimeSec = schedule.overtimeStartHour ? this.convertTimeToSeconds(schedule.overtimeStartHour) : null;

          // Si se especificó un typeAppointmentId, filtrar por su disponibilidad horaria
          if (typeAvailability) {
            const typeStartSec = this.convertTimeToSeconds(typeAvailability.startTime);
            const typeEndSec = this.convertTimeToSeconds(typeAvailability.endTime);

            // Ajustar el rango horario a la intersección entre el schedule y la disponibilidad del tipo de turno
            openSec = Math.max(openSec, typeStartSec);
            closeSec = Math.min(closeSec, typeEndSec);

            // Si no hay intersección válida, saltar este schedule
            if (openSec >= closeSec) {
              continue;
            }
          }

          // Si existe overtimeStartHour, el límite superior es overtimeStartHour en lugar de closeHour
          const effectiveCloseSec = overtimeSec !== null ? Math.min(overtimeSec, closeSec) : closeSec;
          
          // iterate from open to just before effective close, considering duration
          for (let t = openSec; t + stepSeconds <= effectiveCloseSec; t += stepSeconds) {
            const timeStr = this.formatTime(t);

            // Los horarios devueltos son siempre horarios normales (no sobreturnos)
            const isOvertime = false;

            // Skip past times for current day
            if (selectedDate.isSame(nowTz, 'day')) {
              const candidate = moment.tz(`${dateStr} ${timeStr}`, 'YYYY-MM-DD HH:mm', this.timezone);
              if (candidate.isBefore(nowTz)) continue;
            }

            // Validate no overlap with existing appointments
            try {
              await this.validateTurn(timeStr, existingTurns, String(stepSeconds));
              available.push({ time: timeStr, slotId: slot.id, scheduleId: schedule.id, isOvertime });
            } catch {
              // Overlaps, skip
            }
          }
        }
      }
        
      return { date: dateStr, available, booked };
      
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error getting available appointments: ${(error as Error).message}`);
      throw new ErrorManager((error as Error).message, 400);
    }
  }

}
