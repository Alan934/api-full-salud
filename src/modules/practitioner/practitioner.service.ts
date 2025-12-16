import { MaxLength } from 'class-validator';
import {
  forwardRef,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as xml2js from 'xml2js';
import {
  getPagingData,
  PaginationMetadata
} from '../../common/util/pagination-data.util';
import { ErrorManager } from '../../common/exceptions/error.manager';
import {
  Conditions,
  DynamicQueryBuilder
} from '../../common/util/dynamic-query-builder.util';
import {
  ProfessionalDegree,
  Patient,
  Prescription,
  ChargeItem,
  Practitioner,
  AppointmentSlot,
  PractitionerRole,
  Appointment,
  SocialWork
} from '../../domain/entities';
import { EntityManager, ILike, LessThan, Not, Repository, SelectQueryBuilder, In } from 'typeorm';
import { modePractitioner } from '../../domain/enums/mode-practitioner.enum';
import { Gender, Role, Day, AppointmentStatus} from '../../domain/enums';
import * as bcrypt from 'bcrypt';
import {
  CreatePractitionerDto,
  PractitionerByNameAndLicenseDto,
  UpdatePractitionerDto
} from '../../domain/dtos/practitioner/practitioner.dto';
import { PractitionerFilteredPaginationDto } from '../../domain/dtos/practitioner/practitioner-filtered-pagination.dto';
import { AuthService } from '../auth/auth.service';
import { PaginationDto } from '../../common/dtos/pagination-common.dto';
import { plainToInstance } from 'class-transformer';
import { SerializerPractitionerDto } from '../../domain/dtos';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PractitionerSocialWork } from '../../domain/entities/practitioner-social-work.entity';
import { MailService } from '../mail/mail.service';
import { normalizeEmail } from '../../common/util/normalizedEmail';
import { PendingSocialWorkDetail } from '../../domain/entities/pending_social_work_detail.entity';
import { SisaPractitionerResponse, SisaResponse } from '../../domain/interface/sisa-response.interface';
import { Token } from '../auth/decorators';
import { envConfig } from '../../config/envs';
import { AppointmentSlotService } from '../appointment_slot/appointment-slot.service';


@Injectable()
export class PractitionerService {
  private readonly logger = new Logger(PractitionerService.name);

  constructor(
    @InjectRepository(Practitioner) protected repository: Repository<Practitioner>,
    @InjectRepository(PractitionerRole) private readonly practitionerRoleRepository: Repository<PractitionerRole>,
    @InjectRepository(Patient) private readonly patientRepository: Repository<Patient>,
    @InjectRepository(ProfessionalDegree) private readonly professionalDegreeRepository: Repository<ProfessionalDegree>,
    @InjectRepository(PractitionerSocialWork) private readonly practitionerSocialWorkRepository: Repository<PractitionerSocialWork>, // Repositorio para la entidad intermedia
    @InjectRepository(AppointmentSlot) private readonly practitionerAppointmentRepository: Repository<AppointmentSlot>,
    @Inject(forwardRef(() => AuthService)) private readonly authService: AuthService,
    @Inject() private readonly appointmentSlotService: AppointmentSlotService,
    private readonly httpService: HttpService,
    private readonly entityManager: EntityManager,
    private readonly emailService: MailService,
  ) {
  }

  //Register de practitioner
  async createSpecialist(createSpecialistDto: CreatePractitionerDto) {
    return this.entityManager.transaction(async manager => {
      try {
        const practitionerRepository = manager.getRepository(Practitioner);
        const socialWorkRepository = manager.getRepository(SocialWork);

        //Normalizar y extraer datos
        const { password, dni, license, email, username, socialWorkDetails, appointmentSlots, ...userData } = {
          ...createSpecialistDto,
          email: normalizeEmail(createSpecialistDto.email)
        };

        // Validaciones básicas de campos requeridos
        if (!email || !password || !dni) {
          throw new ErrorManager('Por favor, complete todos los campos obligatorios: correo electrónico, contraseña y DNI', 400);
        }

        // Validar existencia previa
        const existingUser = await this.authService.findUserByIdentity(email, dni);
        if (existingUser) {
          if (existingUser.email === email) {
            throw new ErrorManager('Este correo electrónico ya está registrado en el sistema', 400);
          } else {
            throw new ErrorManager('Ya existe un usuario registrado con este número de DNI', 400);
          }
        }

        // Validación en SISA
        let sisaProfession: string | undefined;
        if (dni && license) {
          try {
            const sisaValidation = await this.validatePractitionerInSisa(dni, license);
            if (sisaValidation.isValid && sisaValidation.professionalInfo) {
              sisaProfession = sisaValidation.professionalInfo.profession;
            }
          } catch (error) {
            if (error instanceof ErrorManager) {
              // Personalizar mensajes de error del SISA
              if (error.message.includes('No valid license found')) {
                throw new ErrorManager('La matrícula ingresada no coincide con los registros del SISA. Por favor, verifique el número de matrícula', 400);
              }
              if (error.message.includes('Professional not found')) {
                throw new ErrorManager('No se encontró el profesional en el sistema SISA. Por favor, verifique el DNI ingresado', 400);
              }
              throw error;
            }
            throw new ErrorManager('Hubo un problema al validar sus datos en el sistema SISA. Por favor, intente nuevamente más tarde', 500);
          }
        }

        // Validación de título profesional
        let professionalDegree: ProfessionalDegree | undefined;
        if (sisaProfession) {
          professionalDegree = await this.ensureAndGetProfessionalDegree(sisaProfession);
        } else if (createSpecialistDto.professionalDegreeId) {
          professionalDegree = await this.professionalDegreeRepository.findOneBy({
            id: createSpecialistDto.professionalDegreeId
          });
          if (!professionalDegree) {
            throw new ErrorManager('El título profesional seleccionado no es válido', 400);
          }
        }

        // Validación de obras sociales
        if (socialWorkDetails?.length) {
          for (const detail of socialWorkDetails) {
            const socialWorkExists = await socialWorkRepository.findOneBy({ id: detail.socialWorkId });
            if (!socialWorkExists) {
              throw new ErrorManager('Una de las obras sociales seleccionadas no existe en el sistema', 400);
            }
            if (detail.price < 0) {
              throw new ErrorManager('El precio de la consulta no puede ser negativo', 400);
            }

          }
        }

        const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

        const practitioner = practitionerRepository.create({
          ...userData,
          dni,
          password: hashedPassword,
          role: Role.PRACTITIONER,
          license,
          email,
          username,
          professionalDegree,
          pendingSocialWorkDetails: socialWorkDetails
        });

        const savedPractitioner = await practitionerRepository.save(practitioner);

        // Guardar appointment slots con validación de horarios
        if (appointmentSlots?.length) {
          for (const slot of appointmentSlots) {
            await this.appointmentSlotService.createSlotWithValidation(
              slot,
              savedPractitioner,
              manager
            );
          }
        }

        //Enviar email de verificación
        const token = await this.authService.sendVerificationEmail(savedPractitioner);

        //Devolver practitioner serializado
        const fullPractitioner = await practitionerRepository.findOne({
          where: { id: savedPractitioner.id },
          relations: [
            'professionalDegree',
            'practitionerRole',
            'socialWorkEnrollment',
            'socialWorkEnrollment.socialWork',
            'practitionerSocialWorks',
            'practitionerSocialWorks.socialWork',
            'appointmentSlots',
            'appointmentSlots.schedules'
          ]
        });
        const practitionerDto = plainToInstance(SerializerPractitionerDto, fullPractitioner);

        return {
          ...practitionerDto,
          token,
          message: 'Practitioner created successfully. Please verify your email to access the system.',
        }

      } catch (error) {
        if (error instanceof ErrorManager) throw error;
        throw new ErrorManager('Ocurrió un error al crear el profesional. Por favor, intente nuevamente', 500);
      }
    });
  }

  async practitionerAppointmentAfterVerification(practitionerId: string) {
    try {
      return this.entityManager.transaction(async manager => {
        const practitionerRepository = manager.getRepository(Practitioner);
        const practitionerSocialWorkRepository = manager.getRepository(PractitionerSocialWork);
        const socialWorkRepository = manager.getRepository(SocialWork);
        const practitionerAppointmentRepository = manager.getRepository(AppointmentSlot);
        const pendingSocialWorkDetailRepository = manager.getRepository(PendingSocialWorkDetail);

        const practitioner = await practitionerRepository.findOne({
          where: { id: practitionerId },
          relations: [
            'pendingSocialWorkDetails'
          ],
        });

        if (!practitioner) throw new ErrorManager('Profesional no encontrado', HttpStatus.NO_CONTENT);
        if (!practitioner.activated) throw new ErrorManager('El profesional aún no ha verificado su correo', HttpStatus.BAD_REQUEST);

        // Crear los horarios de atención por defecto usando el manager de la transacción
        // const weekDays = [
        //   Day.SUNDAY,
        //   Day.MONDAY,
        //   Day.TUESDAY,
        //   Day.WEDNESDAY,
        //   Day.THURSDAY,
        //   Day.FRIDAY,
        //   Day.SATURDAY
        // ];

        // const defaultSlots = weekDays.map((d) =>
        //   practitionerAppointmentRepository.create({
        //     openingHour: '09:00',
        //     closeHour: '18:00',
        //     durationAppointment: 30,
        //     day: d,
        //     practitioner: practitioner,
        //   })
        // );
        // await practitionerAppointmentRepository.save(defaultSlots);


        // Asociar las obras sociales
        if (practitioner.pendingSocialWorkDetails?.length) {
          for (const detail of practitioner.pendingSocialWorkDetails) {
            const socialWork = await socialWorkRepository.findOneBy({ id: detail.socialWorkId });
            if (!socialWork) continue;

            const newPsw = practitionerSocialWorkRepository.create({
              practitioner,
              socialWork,
              practitionerId: practitioner.id,
              socialWorkId: socialWork.id,
              price: detail.price,
            });
            await practitionerSocialWorkRepository.save(newPsw);
          }
          await pendingSocialWorkDetailRepository.remove(practitioner.pendingSocialWorkDetails);
        }

        return true;
      });
    }
    catch (error) {
      throw error;

    }
  }

  async getAll(): Promise<Practitioner[]> {
    try {
      return await this.repository.find({
        where: { deletedAt: null },
        relations: [
          'professionalDegree',
          'practitionerRole',
          'socialWorkEnrollment',
          'socialWorkEnrollment.socialWork',
          'practitionerSocialWorks',
          'practitionerSocialWorks.socialWork',
          'appointmentSlots',
          'appointmentSlots.schedules'
        ]
      });
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }
  async getOne(id: string): Promise<Practitioner> {
    try {
      const practitioner = await this.repository.findOne({
        where: { id },
        relations: [
          'practitionerRole',
          'professionalDegree',
          'socialWorkEnrollment',
          'socialWorkEnrollment.socialWork',
          'practitionerSocialWorks',
          'practitionerSocialWorks.socialWork',
          'appointmentSlots',
          'appointmentSlots.schedules'
        ],
      });

      if (!practitioner) {
        throw new ErrorManager(`Specialist with ID ${id} not found`, HttpStatus.NO_CONTENT);
      }
      return practitioner;
    } catch (error) {
      if (error instanceof ErrorManager) throw error;
      if (error instanceof NotFoundException) throw error;
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }
  async update(id: string, updateSpecialistDto: UpdatePractitionerDto): Promise<Practitioner> {
    return this.entityManager.transaction(async manager => {
      try {
        const practitionerRepository = manager.getRepository(Practitioner);
        const practitionerSocialWorkRepository = manager.getRepository(PractitionerSocialWork);
        const socialWorkRepository = manager.getRepository(SocialWork);

        // Usar el this.getOne para asegurar que las relaciones base se cargan
        // pero luego trabajar con la instancia obtenida por el manager para la transacción
        const practitionerToUpdate = await practitionerRepository.findOne({
          where: { id },
          relations: ['practitionerSocialWorks'] // Cargar las obras sociales actuales para comparar
        });

        if (!practitionerToUpdate) {
          throw new ErrorManager(`Specialist with ID ${id} not found`, HttpStatus.NO_CONTENT);
        }

        const { practitionerRole, professionalDegreeId, socialWorkDetails, ...updatedUserFields } = {
          ...updateSpecialistDto,
          email: normalizeEmail(updateSpecialistDto.email)
        };

        // Validar que campos únicos como email, dni, username no colisionen con otros usuarios
        const uniqueChecks: ({ [key: string]: any; id?: any })[] = [];
        if (updatedUserFields.email) uniqueChecks.push({ email: updatedUserFields.email, id: Not(id) });
        if (updatedUserFields.dni) uniqueChecks.push({ dni: updatedUserFields.dni, id: Not(id) });
        if (updatedUserFields.username) uniqueChecks.push({ username: updatedUserFields.username, id: Not(id) });
        if (updatedUserFields.phone) uniqueChecks.push({ phone: updatedUserFields.phone, id: Not(id) });

        if (uniqueChecks.length > 0) {
          const existingPractitioner = await practitionerRepository.findOne({ where: uniqueChecks });
          if (existingPractitioner) {
            throw new ErrorManager('Another practitioner already exists with the provided DNI, email, username, or phone.', 400);
          }
          // También verificar contra pacientes para email y username
          const patientChecks = [];
          if (updatedUserFields.email) patientChecks.push({ email: updatedUserFields.email });
          if (updatedUserFields.username) patientChecks.push({ username: updatedUserFields.username });
          if (patientChecks.length > 0) {
            const existingPatient = await manager.getRepository(Patient).findOne({ where: patientChecks });
            if (existingPatient) {
              throw new ErrorManager('A patient already exists with the provided email or username.', 400);
            }
          }
        }

        // Actualizar campos directos de Practitioner (User)
        practitionerRepository.merge(practitionerToUpdate, updatedUserFields);

        if (practitionerRole) {
          const practitionerRoleEntities = await manager.getRepository(PractitionerRole).findByIds(
            practitionerRole.map((s) => s.id),
          );
          if (practitionerRoleEntities.length !== practitionerRole.length) {
            throw new ErrorManager('Some practitionerRole not found', HttpStatus.NO_CONTENT);
          }
          practitionerToUpdate.practitionerRole = practitionerRoleEntities;
        }

        if (professionalDegreeId) {
          const professionalDegreeEntity = await manager.getRepository(ProfessionalDegree).findOne({ where: { id: professionalDegreeId } });
          if (!professionalDegreeEntity) {
            throw new ErrorManager(`professionalDegree with id "${professionalDegreeId}" not found`, HttpStatus.NO_CONTENT);
          }
          practitionerToUpdate.professionalDegree = professionalDegreeEntity;
        }

        // Manejar actualización de PractitionerSocialWorks
        if (socialWorkDetails) { // Si se envía socialWorkDetails (incluso vacío para borrar todo)
          // 1. Eliminar las PractitionerSocialWork existentes para este practitioner
          if (practitionerToUpdate.practitionerSocialWorks && practitionerToUpdate.practitionerSocialWorks.length > 0) {
            await practitionerSocialWorkRepository.remove(practitionerToUpdate.practitionerSocialWorks);
          }

          // 2. Crear las nuevas PractitionerSocialWork
          const newPswEntities: PractitionerSocialWork[] = [];
          for (const detail of socialWorkDetails) {
            const socialWorkExists = await socialWorkRepository.findOneBy({ id: detail.socialWorkId });
            if (!socialWorkExists) {
              throw new ErrorManager(`SocialWork with ID ${detail.socialWorkId} not found.`, HttpStatus.NO_CONTENT);
            }
            const newPsw = practitionerSocialWorkRepository.create({
              practitioner: practitionerToUpdate,
              socialWork: socialWorkExists,
              price: detail.price,
            });
            newPswEntities.push(newPsw);
          }
          if (newPswEntities.length > 0) {
            await practitionerSocialWorkRepository.save(newPswEntities);
          }
          // La relación en practitionerToUpdate se actualizará por el save de arriba o recargando la entidad.
          // Para evitar una recarga, podemos asignarla manualmente si el save no devuelve la relación anidada actualizada.
          // practitionerToUpdate.practitionerSocialWorks = await practitionerSocialWorkRepository.find({where: {practitionerId: practitionerToUpdate.id}, relations: ['socialWork'] });
        }

        await practitionerRepository.save(practitionerToUpdate);

        // Manejar actualización de appointment slots (acepta appointmentSlot o appointmentSlots como alias)
        const rawSlots: any[] = (updateSpecialistDto as any).appointmentSlots ?? updateSpecialistDto.appointmentSlot ?? [];
        if (Array.isArray(rawSlots) && rawSlots.length > 0) {
          this.logger.debug(`[PractitionerService.update] Slots recibidos: ${JSON.stringify(rawSlots)}`);
          for (const slotDto of rawSlots) {
            if (!slotDto) continue;
            slotDto.practitionerId = id;

            // Normalizar formateo de horarios HH:MM:SS -> HH:MM si viene con segundos
            if (Array.isArray(slotDto.schedules)) {
              slotDto.schedules = slotDto.schedules.map((sch: any) => ({
                ...sch,
                openingHour: typeof sch.openingHour === 'string' ? sch.openingHour.substring(0,5) : sch.openingHour,
                closeHour: typeof sch.closeHour === 'string' ? sch.closeHour.substring(0,5) : sch.closeHour,
                overtimeStartHour: typeof sch.overtimeStartHour === 'string' ? sch.overtimeStartHour.substring(0,5) : sch.overtimeStartHour,
              }));
            }

            if (slotDto.id) {
              this.logger.debug(`[PractitionerService.update] Actualizando slot existente id=${slotDto.id}`);
              await this.appointmentSlotService.update(slotDto.id, slotDto);
            } else {
              this.logger.debug(`[PractitionerService.update] Creando nuevo slot day=${slotDto.day}`);
              if (!slotDto.day || !slotDto.schedules || slotDto.schedules.length === 0) {
                throw new ErrorManager('Para crear un nuevo horario de atención se requiere enviar el día y los horarios.', 400);
              }
              const createSlotDto = {
                day: slotDto.day,
                schedules: slotDto.schedules,
                durationAppointment: slotDto.durationAppointment,
                unavailable: slotDto.unavailable,
                practitionerId: id,
              } as const;
              await this.appointmentSlotService.createSlotWithoutMerge(
                createSlotDto as any,
                practitionerToUpdate,
                manager
              );
            }
          }
          // Recargar los slots después de procesar la creación/actualización para asegurar que se incluyan en la respuesta
          practitionerToUpdate.appointmentSlots = await manager.getRepository(AppointmentSlot).find({
            where: { practitioner: { id: practitionerToUpdate.id } },
            relations: ['schedules' ]
          });
          this.logger.debug(`[PractitionerService.update] Total slots ahora: ${practitionerToUpdate.appointmentSlots.length}`);
        } else {
          this.logger.debug('[PractitionerService.update] No se recibieron nuevos appointment slots');
        }

        // Recargar la entidad para devolverla completa con todas las relaciones actualizadas
        const fullPractitioner = await practitionerRepository.findOne({
          where: { id: practitionerToUpdate.id },
          relations: [
            'professionalDegree',
            'practitionerRole',
            'socialWorkEnrollment',
            'socialWorkEnrollment.socialWork',
            'practitionerSocialWorks',
            'practitionerSocialWorks.socialWork',
            'appointmentSlots',
            'appointmentSlots.schedules'
          ]
        });

        if (!fullPractitioner) {
          throw new ErrorManager(`Practitioner with ID ${id} not found after update`, HttpStatus.NO_CONTENT);
        }

        return fullPractitioner!; // Non-null assertion, ya que acabamos de guardarlo.

      } catch (error) {
        if (error instanceof ErrorManager) throw error;
        if (error instanceof NotFoundException) throw error;
        throw ErrorManager.createSignatureError((error as Error).message);
      }
    });
  }
  async softDelete(id: string): Promise<{ message: string }> {
    try {
      const practitioner = await this.getOne(id);

      if (!practitioner) {
        throw new ErrorManager(`Practitioner with ID ${id} not found`, HttpStatus.NO_CONTENT);
      }

      await this.repository.softRemove(practitioner);

      return { message: 'Practitioner soft deleted successfully' };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }
  async remove(id: string): Promise<string> {
    try {
      const entity = await this.getOne(id);
      if (!entity) {
        throw new ErrorManager(`Practitioner with ID ${id} not found`, HttpStatus.NO_CONTENT);
      }
      return this.repository.manager.transaction(
        async (manager: EntityManager) => {
          await manager //eliminar el especialista de turno
            .createQueryBuilder()
            .update(Appointment)
            .set({ practitioner: null })
            .where('specialist_id = :id', { id: entity.id })
            .execute();
          await manager //eliminar el especialista de prescripcion
            .createQueryBuilder()
            .update(Prescription)
            .set({ practitioner: null })
            .where('specialist_id = :id', { id: entity.id })
            .execute();
          await manager.delete(AppointmentSlot, {
            practitioner: entity
          });
          await manager.delete(ChargeItem, { practitioner: entity });
          await manager.remove(Practitioner, entity);
          return `Entity with id ${id} deleted`;
        }
      );
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }
  async softRemove(id: string): Promise<string> {
    try {
      const entity = await this.getOne(id);
      if (!entity) {
        throw new ErrorManager(`Practitioner with ID ${id} not found`, HttpStatus.NO_CONTENT);
      }
      return this.repository.manager.transaction(
        async (manager: EntityManager) => {
          await manager.softDelete(ChargeItem, { practitioner: entity });
          await manager.softRemove(entity);
          return `Entity with id ${id} soft deleted`;
        }
      );
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }
  async restore(id: string): Promise<Practitioner> {
    try {
      const entity = await this.repository.findOne({
        where: { id },
        withDeleted: true
      });
      if (!entity || !entity.deletedAt) {
        throw new ErrorManager(`Practitioner with ID ${id} not found or not deleted`, HttpStatus.NO_CONTENT);
      }
      return this.repository.manager.transaction(
        async (manager: EntityManager) => {
          const recovered = await manager.recover(entity);
          await manager.restore(ChargeItem, { practitioner: entity });
          return recovered;
        }
      );
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }
  // Recuperar un especialista eliminado
  async recover(id: string): Promise<{ message: string }> {
    try {
      const practitioner = await this.repository.findOne({
        where: { id },
        withDeleted: true
      });

      if (!practitioner || !practitioner.deletedAt) {
        throw new ErrorManager(
          `Practitioner with ID ${id} not found or not deleted`,
          HttpStatus.NO_CONTENT
        );
      }

      await this.repository.recover(practitioner);

      return { message: 'Practitioner recovered successfully' };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  //METODOS AUXILIARES

  async getPractitionerSisaData(dni: string): Promise<SisaPractitionerResponse> {
    try {
      const sisaUrl = `https://sisa.msal.gov.ar/sisa/services/rest/profesional/obtener?nrodoc=${dni}&usuario=${envConfig.SISA_USERNAME}&clave=${envConfig.SISA_PASSWORD}`;
        
      const response = await firstValueFrom(this.httpService.get(sisaUrl, {
        responseType: 'text',
        headers: {
          'Accept': 'application/xml, text/xml'
        }
      }));
  
      const responseData = response.data;
  
      if (typeof responseData !== 'string' || !responseData.trim().startsWith('<?xml')) {
        throw new ErrorManager('Invalid response format from SISA', 500);
      }
  
      const parser = new xml2js.Parser({
        explicitArray: false,
        trim: true,
        ignoreAttrs: true,
        explicitRoot: true,
        tagNameProcessors: [xml2js.processors.stripPrefix]
      });
  
      const parsedResult = await parser.parseStringPromise(responseData);
  
      if (!parsedResult || !parsedResult.Profesional) {
        throw new ErrorManager('Invalid XML structure', 500);
      }
  
      const profesionalData = parsedResult.Profesional;
  
      // Verificar si el resultado es OK (manejar posibles problemas de formato)
      if (!profesionalData.resultado || profesionalData.resultado.trim().toUpperCase() !== 'OK') {
        throw new ErrorManager('Professional not found in SISA database', HttpStatus.NO_CONTENT);
      }
  
      // Manejar las matrículas
      const matriculas = profesionalData.matriculas?.matricula
        ? Array.isArray(profesionalData.matriculas.matricula)
          ? profesionalData.matriculas.matricula
          : [profesionalData.matriculas.matricula]
        : [];
  
      // Filtrar solo las matrículas habilitadas
      const matriculasHabilitadas = matriculas
        .filter(m => m.estado === 'Habilitado')
        .map(m => ({
          matricula: m.matricula,
          provincia: m.provincia,
          profesion: m.profesion,
          estado: m.estado
        }));
  
      // Verificar si hay matrículas habilitadas
      if (matriculasHabilitadas.length === 0) {
        throw new ErrorManager('No enabled matriculas found for this professional', HttpStatus.NO_CONTENT);
      }
  
      return {
        nombre: profesionalData.nombre,
        apellido: profesionalData.apellido,
        tipoDocumento: profesionalData.tipoDocumento,
        numeroDocumento: profesionalData.numeroDocumento,
        cuit: profesionalData.cuit,
        matriculasHabilitadas
      };
  
    } catch (error) {
      if (error instanceof ErrorManager) {
        throw error;
      }
    
      if ((error as any)?.response?.status === 404) {
        throw new ErrorManager('Professional not found in SISA database', 404);
      }
  
      if ((error as any)?.response?.status === 401 || (error as any)?.response?.status === 403) {
        throw new ErrorManager('Authentication error with SISA service', 401);
      }
  
      throw new ErrorManager(
        `Error getting SISA data: ${(error as Error).message}`,
        500
      );
    }
  }

  async validatePractitionerInSisa(dni: string, license: string): Promise<SisaResponse> {
    try {
      // getPractitionerSisaData para obtener los datos del profesional
      const practitionerData = await this.getPractitionerSisaData(dni);

      if (!practitionerData){
        throw new ErrorManager('No se encontró el profesional en SISA', HttpStatus.NO_CONTENT);
      }
      
      if (!practitionerData.matriculasHabilitadas || practitionerData.matriculasHabilitadas.length === 0) {
        throw new ErrorManager('No se encontraron matriculas habilitadas para este profesional en SISA', HttpStatus.NO_CONTENT);
      }
  
      // Buscar si la matrícula ingresada coincide con alguna de las habilitadas
      const matchingMatricula = practitionerData.matriculasHabilitadas.find(
        (matricula) => matricula.matricula === license
      );
  
      if (!matchingMatricula) {
        const availableMatriculas = practitionerData.matriculasHabilitadas
          .map((m) => `${m.matricula} (${m.profesion})`)
          .join(', ');
        throw new ErrorManager(
          `La matrícula ${license} no coincide con ninguna de las matrículas registradas en SISA.`,
          // Para mostrar las matrículas disponibles:
          //`La matrícula ${license} no coincide con ninguna de las matrículas registradas en SISA. Matrículas disponibles: ${availableMatriculas}`,
          HttpStatus.NO_CONTENT
        );
      }
  
      return {
        isValid: true,
        professionalInfo: {
          name: practitionerData.nombre,
          lastName: practitionerData.apellido,
          profession: matchingMatricula.profesion,
          license: matchingMatricula.matricula,
        },
      };
    } catch (error) {
      if (error instanceof ErrorManager) {
        throw error;
      }
      throw new ErrorManager(
        `Error validating practitioner in SISA: ${(error as Error).message}`,
        500
      );
    }
  }

  private async ensureAndGetProfessionalDegree(professionName: string): Promise<ProfessionalDegree> {
    try {
      let professionalDegree = await this.professionalDegreeRepository.findOne({
        where: {
          professionalDegree: ILike(professionName)
        }
      });

      if (!professionalDegree) {
        // Si no existe, la creamos
        professionalDegree = this.professionalDegreeRepository.create({
          professionalDegree: professionName
        });
        await this.professionalDegreeRepository.save(professionalDegree);
      }

      return professionalDegree;
    } catch (error) {
      throw new ErrorManager(`Error ensuring professional degree: ${(error as Error).message}`, 500);
    }
  }

  //Metodo para eliminar practitioners inactivos, funciona con el cron job
  async deleteInactivePractitioners(date: Date): Promise<number> {
    try {
      const result = await this.repository.delete({
        activated: false,
        createdAt: LessThan(date),
      });
      return result.affected ?? 0;
    } catch (error) {
      this.logger.error('Error al eliminar practitioners inactivos', error);
      return 0;
    }
  }

  //condiciones que se agregarán al query builder para filtrar los patient turn
  private practitionerConditions: Conditions<Practitioner> = {
    name: (queryBuilder: SelectQueryBuilder<Practitioner>, value: string) =>
      queryBuilder.andWhere('user.name LIKE :name', { name: `%${value}%` }),
    lastName: (queryBuilder: SelectQueryBuilder<Practitioner>, value: string) =>
      queryBuilder.andWhere('user.last_name LIKE :lastName', {
        lastName: `%${value}%`
      }),
    dni: (queryBuilder: SelectQueryBuilder<Practitioner>, value: string) =>
      queryBuilder.andWhere('user.dni LIKE :dni', { dni: `%${value}%` }),
    gender: (queryBuilder: SelectQueryBuilder<Practitioner>, value: Gender) =>
      queryBuilder.andWhere('user.gender = :gender', { gender: value }),
    birth: (queryBuilder: SelectQueryBuilder<Practitioner>, value: Date) =>
      queryBuilder.andWhere(
        '( YEAR(user.birth) = YEAR(:birth) ' +
        'AND MONTH(user.birth) = MONTH(:birth) ' +
        'AND DAY(user.birth) = DAY(:birth) ) ',
        { birth: value }
      ),
    homeService: (
      queryBuilder: SelectQueryBuilder<Practitioner>,
      value: boolean
    ) =>
      queryBuilder.andWhere('practitioner.home_service = :homeservice', {
        homeservice: value
      }),
    license: (queryBuilder: SelectQueryBuilder<Practitioner>, value: string) =>
      queryBuilder.andWhere('practitioner.license = :license', {
        license: value
      }),
    practitionerRole: (
      queryBuilder: SelectQueryBuilder<Practitioner>,
      value: string
    ) => queryBuilder.andWhere('practitioner_role.id = :id', { id: value }),
    socialWorkEnrollmentId: (
      queryBuilder: SelectQueryBuilder<Practitioner>,
      value: string
    ) =>
      queryBuilder.andWhere('social_work_enrrollment.id = :id', { id: value }),
    professionalDegree: (
      queryBuilder: SelectQueryBuilder<Practitioner>,
      value: string
    ) => queryBuilder.andWhere('professionalDegree.id = :id', { id: value })
  };
  // Obtener un especialista por nombre y licencia
  async findByNameAndLicense(
    filterDto: PractitionerByNameAndLicenseDto
  ): Promise<Practitioner> {
    try {
      const queryBuilder = this.repository.createQueryBuilder('practitioner')
        .leftJoinAndSelect('practitioner.practitionerRole', 'practitionerRole')
        .leftJoinAndSelect('practitioner.professionalDegree', 'professionalDegree')
        .leftJoinAndSelect('practitioner.socialWorkEnrollment', 'socialWorkEnrollment')
        .leftJoinAndSelect('socialWorkEnrollment.socialWork', 'socialWorkRel') // Renombrar alias para evitar colisión
        .leftJoinAndSelect('practitioner.practitionerSocialWorks', 'practitionerSocialWorksRel')
        .leftJoinAndSelect('practitionerSocialWorksRel.socialWork', 'swDetails')
        .where('practitioner.deletedAt IS NULL');

      const { name, license } = filterDto;
      if (!name && !license) {
        throw new ErrorManager('At least one filter parameter (name or license) is required', 400);
      }
      if (name && license) {
        queryBuilder.andWhere('(practitioner.name LIKE :name OR practitioner.lastName LIKE :name) AND practitioner.license = :license', { name: `%${name}%`, license });
      } else if (name) {
        queryBuilder.andWhere('practitioner.name LIKE :name OR practitioner.lastName LIKE :name', { name: `%${name}%` });
      } else if (license) {
        queryBuilder.andWhere('practitioner.license = :license', { license });
      }
      const practitioner = await queryBuilder.getOne();
      if (!practitioner) {
        throw new ErrorManager(
          'No practitioner found with the provided filters',
          HttpStatus.NO_CONTENT
        );
      }
      return practitioner;

    } catch (error) {
      if (error instanceof ErrorManager) throw error;
      if (error instanceof NotFoundException) throw error;
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }
  //Override del método base findAll para filtrar por propiedades
  async findAllDeprecated(
    paginationDto: PractitionerFilteredPaginationDto
  ): Promise<{ data: Practitioner[]; meta: PaginationMetadata }> {
    try {
      const { page, limit } = paginationDto;
      //crea un query builder base para traer la entidad con las relaciones que necesita el Serializer
      const queryBuilderBase = this.repository
        .createQueryBuilder('practitioner')
        .leftJoinAndSelect(
          'practitioner.appointmentSlot',
          'appointmentSlot'
        )
        .leftJoinAndSelect(
          'practitioner.professionalDegree',
          'professionalDegree'
        )
        .leftJoinAndSelect('practitioner.practitionerRole', 'practitionerRole');
      //.leftJoinAndSelect('practitioner.acceptedSocialWorks', 'social_work');

      //añade las condiciones where al query builder
      const query = DynamicQueryBuilder.buildSelectQuery<Practitioner>(
        queryBuilderBase,
        this.practitionerConditions,
        paginationDto
      );

      //añade la paginación al query creada
      query.skip((page - 1) * limit).take(limit);

      //ejecuta la query
      const entities = await query.getMany();

      //retorna los resultados
      return {
        data: entities,
        meta: getPagingData(entities, page, limit)
      };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }
  async findAllWithTurns(): Promise<Practitioner[]> {
    try {
      const practitioners = await this.repository
        .createQueryBuilder('practitioner')
        .leftJoinAndSelect(
          'practitioner.appointmentSlot',
          'appointmentSlot'
        )
        .leftJoinAndSelect(
          'practitioner.professionalDegree',
          'professionalDegree'
        )
        .leftJoinAndSelect('practitioner.practitionerRole', 'practitionerRole')
        //.leftJoinAndSelect('practitioner.acceptedSocialWorks', 'social_work')
        .leftJoinAndSelect('practitioner.turns', 'turn')
        //.leftJoinAndSelect('turn.Patient', 'Patient') // Opcional: otras relaciones de Turn
        .getMany();
      if (!practitioners || practitioners.length === 0) {
        throw new ErrorManager('No practitioners found with turns', HttpStatus.NO_CONTENT);
      }
      return practitioners;
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }
  async practitionerPaginationAll(
    filteredDto: PractitionerFilteredPaginationDto
  ): Promise<{
    data: Practitioner[];
    total: number;
    page: number;
    limit: number;
    lastPage: number;
    filters?: any;
  }> {
    try {
      const { page = 1, limit = 10, ...filters } = filteredDto;

      const queryBuilder = this.repository
        .createQueryBuilder('practitioner')
        .leftJoinAndSelect(
          'practitioner.professionalDegree',
          'professionalDegree'
        )
        .leftJoinAndSelect('practitioner.practitionerRole', 'practitionerRole')
        .leftJoinAndSelect('practitioner.socialWorkEnrollment', 'socialWorkEnrollment') // Esta es la obra social principal del profesional
        // .leftJoinAndSelect('socialWorkEnrollment.socialWork', 'swEnrollmentDetail') // Detalle de la OS principal
        .leftJoinAndSelect('practitioner.appointmentSlot', 'appointmentSlot')
        // .leftJoinAndSelect('practitioner.favorite', 'favorite') // 'favorite' no está en Practitioner entity
        // Para las obras sociales que atiende (a través de la entidad intermedia):
        .leftJoinAndSelect('practitioner.practitionerSocialWorks', 'practitionerSocialWorksRel')
        .leftJoinAndSelect('practitionerSocialWorksRel.socialWork', 'acceptedSocialWorkDetail') // Detalle de las OS que atiende
        .where('practitioner.deletedAt IS NULL');

      // Aplicar filtros dinámicos
      // ... (filtros existentes para name, lastName, dni, gender, license, homeService, etc.)
      if (filters.name) {
        queryBuilder.andWhere('(practitioner.name LIKE :name OR practitioner.lastName LIKE :name)', { name: `%${filters.name}%` });
      }
      // ... (otros filtros como estaban) ...
      if (filters.lastName) queryBuilder.andWhere('practitioner.lastName LIKE :lastName', { lastName: `%${filters.lastName}%` });
      if (filters.dni) queryBuilder.andWhere('practitioner.dni LIKE :dni', { dni: `%${filters.dni}%` });
      if (filters.gender) queryBuilder.andWhere('practitioner.gender = :gender', { gender: filters.gender });
      if (filters.license) queryBuilder.andWhere('practitioner.license LIKE :license', { license: `%${filters.license}%` });
      if (filters.homeService !== undefined) queryBuilder.andWhere('practitioner.homeService = :homeService', { homeService: filters.homeService });
      if (filters.durationAppointment) queryBuilder.andWhere('practitioner.durationAppointment = :durationAppointment', { durationAppointment: filters.durationAppointment });
      if (filters.birth) queryBuilder.andWhere('practitioner.birth = :birth', { birth: filters.birth });
      if (filters.professionalDegree) queryBuilder.andWhere('professionalDegree.id = :professionalDegreeId', { professionalDegreeId: filters.professionalDegree });
      if (filters.practitionerRole) queryBuilder.andWhere('practitionerRole.id = :practitionerRoleId', { practitionerRoleId: filters.practitionerRole });

      // Filtro para socialWorkEnrollmentId (obra social principal del profesional)
      if (filters.socialWorkEnrollmentId) {
        queryBuilder.andWhere(
          'socialWorkEnrollment.id = :socialWorkEnrollmentId',
          {
            socialWorkEnrollmentId: filters.socialWorkEnrollmentId
          }
        );
      }

      // Filtro para socialWorkId (obras sociales que atiende el profesional)
      // Esto necesita que el join a practitionerSocialWorks y acceptedSocialWorkDetail exista
      if (filters.socialWorkId) {
        // Para asegurar que no haya duplicados si un practitioner tiene múltiples roles pero solo queremos filtrar por SW
        // y evitar problemas con el COUNT, es mejor usar un subquery o un EXISTS si el filtro es complejo
        // o simplemente un JOIN y luego un DISTINCT en el select principal si es necesario.
        // Por ahora, un andWhere simple, pero tener en cuenta la multiplicidad.
        queryBuilder.andWhere('acceptedSocialWorkDetail.id = :socialWorkId_accepted', {
          socialWorkId_accepted: filters.socialWorkId
        });
      }

      if (filters.locationName) {
        queryBuilder.andWhere('appointmentSlot.location.name LIKE :locationName', { locationName: `%${filters.locationName}%` });
      }
      if (filters.appointmentDay) {
        queryBuilder.andWhere('appointmentSlot.day = :appointmentDay', { appointmentDay: filters.appointmentDay });
      }

      queryBuilder.orderBy('practitioner.name', 'ASC');

      const [data, total] = await queryBuilder
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      if (data.length === 0) {
        throw new ErrorManager('No practitioners found with the provided filters', HttpStatus.NO_CONTENT);
      }

      const lastPage = Math.ceil(total / limit);

      return {
        data,
        total,
        page,
        limit,
        lastPage,
        filters: Object.keys(filters).length > 0 ? filters : undefined
      };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }
  async findAllPaginated(paginationDto: PaginationDto) {
    const { page, limit } = paginationDto;
    const [practitioners, total] = await this.repository.findAndCount({
      where: { deletedAt: null },
      skip: (page - 1) * limit,
      take: limit
    });

    const totalPages = Math.ceil(total / limit);
    const nextPage = page < totalPages ? page + 1 : null;
    const previousPage = page > 1 ? page - 1 : null;

    if (practitioners.length === 0) {
      throw new ErrorManager('No practitioners found', HttpStatus.NO_CONTENT);
    }

    return {
      data: practitioners as unknown as SerializerPractitionerDto[],
      meta: {
        totalPages,
        currentPage: page,
        previousPage,
        nextPage,
        totalItems: total
      }
    }
  }

  // Método auxiliar para generar slots de tiempo
  private generateTimeSlots(startTime: string, endTime: string, duration: number): string[] {
    const slots: string[] = [];
    
    // Normalizar el formato de tiempo (remover segundos si existen)
    const normalizeTime = (time: string): string => {
      return time.length > 5 ? time.substring(0, 5) : time;
    };
    
    const normalizedStartTime = normalizeTime(startTime);
    const normalizedEndTime = normalizeTime(endTime);
    
    this.logger.log(`Generating slots from ${normalizedStartTime} to ${normalizedEndTime} with ${duration}min intervals`);
    
    const start = new Date(`2000-01-01T${normalizedStartTime}:00`);
    const end = new Date(`2000-01-01T${normalizedEndTime}:00`);
    
    if (start >= end) {
      this.logger.warn(`Invalid time range: start time ${normalizedStartTime} is not before end time ${normalizedEndTime}`);
      return slots;
    }
    
    let current = new Date(start);
    
    while (current < end) {
      const timeSlot = current.toTimeString().substring(0, 5);
      slots.push(timeSlot);
      current.setMinutes(current.getMinutes() + duration);
    }
    
    this.logger.log(`Generated ${slots.length} slots: ${slots.join(', ')}`);
    return slots;
  }
}