import {
  Injectable,
  forwardRef,
  Inject,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CreatePatientDto,
  SerializerPatientDto,
  UpdatePatientDto,
  CreateSocialWorkEnrollmentDto,
  CreatePatientForFamilyDto
} from '../../domain/dtos';
import {
  FamilyGroup,
  Patient,
  Practitioner,
  SocialWork,
  SocialWorkEnrollment,
  User
} from '../../domain/entities';
import { ErrorManager } from '../../common/exceptions/error.manager';
import { Not, Repository, DeepPartial, EntityManager } from 'typeorm';
import { Role, DocumentType } from '../../domain/enums';
import { AuthService } from '../auth/auth.service';
import { plainToInstance } from 'class-transformer';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { MailService } from '../mail/mail.service';
import { envConfig } from '../../config/envs';
import { JwtService } from '@nestjs/jwt';
import { normalizeEmail } from '../../common/util/normalizedEmail';
import { FamilyGroupService } from '../family_group/family-group.service';

@Injectable()
export class PatientService {
  constructor(
    @InjectRepository(Patient) protected patientRepository: Repository<Patient>,
    @InjectRepository(Practitioner)
    private readonly practitionerRepository: Repository<Practitioner>,
    @InjectRepository(SocialWorkEnrollment)
    private readonly socialWorkEnrollmentRepository: Repository<SocialWorkEnrollment>,
    @InjectRepository(SocialWork)
    private readonly socialWorkRepository: Repository<SocialWork>,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    @InjectRepository(User)
    protected repository: Repository<User>,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => FamilyGroupService))
    private readonly familyGroupService: FamilyGroupService,
  ) {}

  async createPatient(createPatientDto: CreatePatientDto) {
    const queryRunner = this.patientRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const {
        dni, 
        email, 
        phone,
        username, 
        password,
        socialWorkEnrollmentId, 
        headPatientId,
        familyGroup: familyGroupData,
        familyData,
        ...userData
      } = {
        ...createPatientDto,
        email: normalizeEmail(createPatientDto.email)
      };

      // Validaciones iniciales de mail y dni
      await this.ensureEmailAvailability(email);
      await this.ensureDniAvailability(dni);
      
      const existingPractitioner = await this.practitionerRepository.findOne({
        where: [{ email }, { dni }]
      });
      if (existingPractitioner) {
        let mensaje = '';
        if (existingPractitioner.email === email) {
          mensaje = 'Este correo electrónico ya está registrado por un profesional de la salud';
        } else if (existingPractitioner.dni === dni) {
          mensaje = 'Este número de documento ya está registrado por un profesional de la salud';
        }
        throw new ErrorManager(mensaje, 400);
      }

      // Validaciones de obra social
      if (socialWorkEnrollmentId) {
        if (typeof socialWorkEnrollmentId === 'string') {
          const patientSocialWorkEnrollment = await this.socialWorkEnrollmentRepository.findOne({
            where: { id: socialWorkEnrollmentId },
            relations: ['patient']
          });
          if (!patientSocialWorkEnrollment) {
            throw new NotFoundException('No se encontró el plan de obra social indicado');
          }
          if (patientSocialWorkEnrollment.patient) {
            throw new BadRequestException('Este plan de obra social ya está asignado a otro paciente');
          }
        } else if (typeof socialWorkEnrollmentId === 'object') {
          const enrollmentDto = socialWorkEnrollmentId as CreateSocialWorkEnrollmentDto;
          
          if (enrollmentDto.id) {
            const patientSocialWorkEnrollment = await this.socialWorkEnrollmentRepository.findOne({
              where: { id: enrollmentDto.id },
              relations: ['patient', 'socialWork']
            });
            if (!patientSocialWorkEnrollment) {
              throw new NotFoundException('No se encontró el plan de obra social indicado');
            }
            if (patientSocialWorkEnrollment.patient) {
              throw new BadRequestException('Este plan de obra social ya está asignado a otro paciente');
            }
          } else {
            if (!enrollmentDto.socialWork || !enrollmentDto.socialWork.id) {
              throw new BadRequestException('Por favor, seleccione una obra social para crear el nuevo plan');
            }
            const socialWorkEntity = await this.socialWorkRepository.findOne({
              where: { id: enrollmentDto.socialWork.id }
            });
            if (!socialWorkEntity) {
              throw new NotFoundException('No se encontró la obra social seleccionada');
            }
          }
        }
      }
      
      const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

      let patientSocialWorkEnrollment: SocialWorkEnrollment | null = null;

      if (socialWorkEnrollmentId) {
        if (typeof socialWorkEnrollmentId === 'string') {
          patientSocialWorkEnrollment = await this.socialWorkEnrollmentRepository.findOne({
            where: { id: socialWorkEnrollmentId },
            relations: ['patient']
          });
          if (!patientSocialWorkEnrollment) {
            throw new NotFoundException(
              `SocialWorkEnrollment with ID ${socialWorkEnrollmentId} not found`
            );
          }
          if (patientSocialWorkEnrollment.patient) {
            throw new BadRequestException(
              `SocialWorkEnrollment with ID ${socialWorkEnrollmentId} is already assigned to a patient.`
            );
          }
        } else if (typeof socialWorkEnrollmentId === 'object') {
          const enrollmentDto = socialWorkEnrollmentId as CreateSocialWorkEnrollmentDto;
          
          // Si viene con ID, buscar la entidad existente
          if (enrollmentDto.id) {
            patientSocialWorkEnrollment = await this.socialWorkEnrollmentRepository.findOne({
              where: { id: enrollmentDto.id },
              relations: ['patient', 'socialWork']
            });
            if (!patientSocialWorkEnrollment) {
              throw new NotFoundException(
                `SocialWorkEnrollment with ID ${enrollmentDto.id} not found`
              );
            }
            if (patientSocialWorkEnrollment.patient) {
              throw new BadRequestException(
                `SocialWorkEnrollment with ID ${enrollmentDto.id} is already assigned to a patient.`
              );
            }
          } else {
            // Si no viene con ID, crear una nueva entidad
            if (!enrollmentDto.socialWork || !enrollmentDto.socialWork.id) {
              throw new BadRequestException(
                'socialWork.id is required when creating a new SocialWorkEnrollment through patient creation.'
              );
            }
            const socialWorkEntity = await this.socialWorkRepository.findOne({
              where: { id: enrollmentDto.socialWork.id }
            });
            if (!socialWorkEntity) {
              throw new NotFoundException(
                `SocialWork with ID ${enrollmentDto.socialWork.id} not found for the enrollment.`
              );
            }
            // Primero crea y guarda el SocialWorkEnrollment si es nuevo
            const newEnrollmentEntity = this.socialWorkEnrollmentRepository.create({
              memberNum: enrollmentDto.memberNum,
              plan: enrollmentDto.plan,
              socialWork: socialWorkEntity
            });
            // Guarda la nueva entidad SocialWorkEnrollment ANTES de asignarla al paciente
            patientSocialWorkEnrollment = await this.socialWorkEnrollmentRepository.save(newEnrollmentEntity);
          }
        }
      }

      let familyGroupId: string | undefined;

      // Manejo de grupo familiar
      if (headPatientId) {
        // Unirse a un grupo familiar existente o crear uno si el jefe aún no tiene
        const headPatient = await queryRunner.manager.findOne(Patient, {
          where: { id: headPatientId, deletedAt: null },
          relations: ['familyGroup']
        });

        if (!headPatient) {
          throw new NotFoundException('Paciente jefe de familia no encontrado');
        }

        // Asegurar grupo familiar para el jefe si no existe
        familyGroupId = headPatient.familyGroup?.id
          ? headPatient.familyGroup.id
          : await this.familyGroupService.ensureFamilyGroupForHead(headPatientId, queryRunner.manager);
      } else if (familyGroupData) {
        // Crear nuevo grupo familiar siendo este paciente el jefe
        const newFamilyGroup = queryRunner.manager.create(FamilyGroup, {
          familyGroupName: familyGroupData.familyGroupName,
          familyDescription: familyGroupData.familyDescription,
          isActive: familyGroupData.isActive ?? true
        });

        const savedFamilyGroup = await queryRunner.manager.save(newFamilyGroup);
        familyGroupId = savedFamilyGroup.id;
      }
      
      const patientEntity = queryRunner.manager.create(Patient, {
        ...userData,
        password: hashedPassword,
        dni,
        email,
        phone,
        username: username,
        socialWorkEnrollment: patientSocialWorkEnrollment,
        role: Role.PATIENT,
        familyGroupId
      } as DeepPartial<Patient>);

      const savedPatient = await queryRunner.manager.save(Patient, patientEntity);

      // Si es jefe de familia, actualizar el headPatientId en el grupo familiar
      if (familyGroupData && familyGroupId) {
        await queryRunner.manager.update(FamilyGroup, familyGroupId, {
          headPatientId: savedPatient.id
        });
      }

      // Crear familiares adicionales si se proporcionaron
      if (familyData?.familyMembers && familyData.familyMembers.length > 0 && familyGroupId) {
        for (const memberDto of familyData.familyMembers) {
          await this.createFamilyMember(queryRunner, memberDto, familyGroupId);
        }
      }

      await queryRunner.commitTransaction();
      await queryRunner.release();

      const patientDto = plainToInstance(SerializerPatientDto, savedPatient, {
         excludeExtraneousValues: true,
      });

      // Solo generar token y enviar email para pacientes NO miembros de familia
      if (!headPatientId && savedPatient.email) {
        const payload: JwtPayload = {
          id: savedPatient.id,
          email: savedPatient.email,
          role: savedPatient.role,
          name: savedPatient.name,
          lastName: savedPatient.lastName
        };

        const token = await this.authService.signJWT(payload);

        const token2 = await this.jwtService.sign(payload, {
          secret: envConfig.JWT_SECRET,
          expiresIn: '10m'
        });
        const url = `${envConfig.HOST_DEV}/api/auth/verify-email?token=${token2}`;

        await this.mailService.sendMail(
          savedPatient.email,
          'Email Verification new account',
          `Welcome to Full Salud, to Verify your account click on the next link: ${url}`
        );

        return { ...patientDto, accessToken: token };
      }

      // Para miembros de familia, retornar sin token
      return patientDto;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      
      console.error('Error creating patient:', error);
      
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ErrorManager) {
        throw error;
      }
      throw ErrorManager.createSignatureError('Ocurrió un error inesperado al crear el paciente. Por favor, intente nuevamente');
    }
  }

  // Métodos auxiliares
  private async ensureEmailAvailability(email?: string) {
    const normalizedEmail = email ? normalizeEmail(email) : undefined;

    if (!normalizedEmail) {
      return;
    }

    const existing = await this.authService.findUserByIdentity(normalizedEmail);

    if (existing && existing.email && existing.email === normalizedEmail) {
      throw new ErrorManager('Este correo electrónico ya está en uso', 400);
    }
  }

  private async ensureDniAvailability(dni: string) {
    if (!dni) {
      return;
    }

    const existingPatient = await this.patientRepository.findOne({
      where: { dni, deletedAt: null }
    });

    if (existingPatient) {
      throw new ErrorManager('Ya existe un paciente registrado con este DNI', 400);
    }
  }

private async createFamilyMember(queryRunner: any, memberDto: CreatePatientForFamilyDto, familyGroupId: string) {
  const { dni, phone, socialWorkEnrollmentId, ...memberData } = memberDto;

  const hashedPassword = null; // Los familiares no se crean con contraseña

  // Manejo de obra social para el miembro
  const memberSocialWorkEnrollment = socialWorkEnrollmentId
    ? await this.handleSocialWorkEnrollment(socialWorkEnrollmentId)
    : await this.getOrCreateParticularEnrollment(queryRunner.manager);

  const memberEntity = this.patientRepository.create({
    ...memberData,
    password: hashedPassword,
    dni,
    phone,
    socialWorkEnrollment: memberSocialWorkEnrollment,
    role: Role.PATIENT,
    activated: false,
    familyGroupId
  });

  return await queryRunner.manager.save(memberEntity);
}

private async handleSocialWorkEnrollment(socialWorkEnrollmentId: string | CreateSocialWorkEnrollmentDto) {
  if (typeof socialWorkEnrollmentId === 'string') {
    const enrollment = await this.socialWorkEnrollmentRepository.findOne({
      where: { id: socialWorkEnrollmentId },
      relations: ['patient'],
    });
    if (!enrollment) throw new NotFoundException('No se encontró el plan de obra social indicado');
    if (enrollment.patient) throw new BadRequestException('Este plan de obra social ya está asignado a otro paciente');
    return enrollment;
  }

  const enrollmentDto = socialWorkEnrollmentId as CreateSocialWorkEnrollmentDto;
  if (enrollmentDto.id) {
    const enrollment = await this.socialWorkEnrollmentRepository.findOne({
      where: { id: enrollmentDto.id },
      relations: ['patient', 'socialWork'],
    });
    if (!enrollment) throw new NotFoundException('No se encontró el plan de obra social indicado');
    if (enrollment.patient) throw new BadRequestException('Este plan de obra social ya está asignado a otro paciente');
    return enrollment;
  }

  if (!enrollmentDto.socialWork || !enrollmentDto.socialWork.id) {
    throw new BadRequestException('Debe seleccionar una obra social para crear el nuevo plan');
  }

  const socialWorkEntity = await this.socialWorkRepository.findOne({ where: { id: enrollmentDto.socialWork.id } });
  if (!socialWorkEntity) throw new NotFoundException('No se encontró la obra social seleccionada');

  const newEnrollment = this.socialWorkEnrollmentRepository.create({
    memberNum: enrollmentDto.memberNum,
    plan: enrollmentDto.plan,
    socialWork: socialWorkEntity,
  });

  return await this.socialWorkEnrollmentRepository.save(newEnrollment);
}

// Crea un SocialWorkEnrollment con la obra social "Particular FUSEA" por defecto (crea la OS si no existe)
private async getOrCreateParticularEnrollment(manager: EntityManager): Promise<SocialWorkEnrollment | null> {
  try {
    // Buscar obra social "Particular FUSEA"
    let particular = await manager.findOne(SocialWork, { where: { name: 'Particular FUSEA' } });

    if (!particular) {
      // Si no existe, crearla mínimamente
      const newSW = manager.create(SocialWork, { name: 'Particular FUSEA' });
      particular = await manager.save(newSW);
    }

    const newEnrollment = manager.create(SocialWorkEnrollment, { socialWork: particular });
    return await manager.save(newEnrollment);
  } catch {
    // Si algo falla, continuar sin asignar (no bloquear creación de paciente)
    return null;
  }
}


async getAll(
    page = 1,
    limit = 10,
    patientId?: string,
    patientName?: string,
    dni?: string,
    email?: string,
    status: string[] = [],
    familyGroupId?: string,
    withFamilyMembers = false
  ): Promise<{
    patients: Patient[]; 
    total: number; 
    page: number; 
    limit: number; 
    previousPage: number | null;
  }> {
    try {
      const queryBuilder = this.patientRepository.createQueryBuilder('patient')
        .leftJoinAndSelect('patient.socialWorkEnrollment', 'socialWorkEnrollment')
        .leftJoinAndSelect('socialWorkEnrollment.socialWork', 'socialWork')
        .leftJoinAndSelect('patient.familyGroup', 'familyGroup')
        .where('patient.deletedAt IS NULL');

      if (patientId) {
        queryBuilder.andWhere('patient.id = :patientId', { patientId });
      }

      if (familyGroupId) {
        queryBuilder.andWhere('patient.familyGroupId = :familyGroupId', { familyGroupId });
      }

      // filtro por nombre o apellido (o ambos) del paciente, sin distinguir mayúsculas minúsculas o tildes
      if (patientName?.trim()) {
        queryBuilder.andWhere(
          `
            TRANSLATE(
              LOWER(CONCAT(patient.name, ' ', patient.lastName)),
                'áéíóúÁÉÍÓÚÜü',
                'aeiouaeiouuu') 
              LIKE CONCAT('%',
                TRANSLATE(LOWER(:patient), 'áéíóúÁÉÍÓÚÜü', 'aeiouaeiouuu'),
            '%')
          `,
          { patient: `%${patientName.trim().toLowerCase()}%` }
        );
      }

      // filtro por dni, ignora si tiene puntos o no
      if (dni?.trim()) {
        queryBuilder.andWhere(
          `
            REPLACE(patient.dni, '.', '') LIKE REPLACE(:dni, '.', '')
          `,
          { dni: `%${dni.trim()}%` }
        );
      }

      // filtro por email
      if (email?.trim()) {
        queryBuilder.andWhere(
          `patient.email ILIKE :email`,
          { email: `%${email.trim()}%` }
        );
      }

      queryBuilder
        .orderBy('patient.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      const [data, total] = await queryBuilder.getManyAndCount();

      // Opcionalmente incluir miembros del grupo familiar para cada paciente
      if (withFamilyMembers) {
        for (const p of data) {
          if ((p as any).familyGroupId) {
            const members = await this.patientRepository.find({
              where: { familyGroupId: (p as any).familyGroupId },
              relations: ['familyGroup'],
            });
            (p as any).familyMembers = members.filter(m => m.id !== p.id);
          } else {
            (p as any).familyMembers = [];
          }
        }
      }

      return {
        patients: data,
        total,
        page,
        limit,
        previousPage: page > 1 ? page - 1 : null
      };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async getOne(id: string, withFamilyMembers: boolean): Promise<Patient> {
    try {
      const patient = await this.patientRepository.findOne({
        where: { id, deletedAt: null },
        //relations: ['socialWorkEnrollment', 'socialWorkEnrollment.socialWork', /*'relationship'*/, 'favorites']
      });

      if (!patient) {
        throw new NotFoundException(`Patient with ID ${id} not found`);
      }

      if (withFamilyMembers && (patient as any).familyGroupId) {
        const members = await this.patientRepository.find({
          where: { familyGroupId: (patient as any).familyGroupId },
          relations: ['familyGroup']
        });
        (patient as any).familyMembers = members.filter(m => m.id !== patient.id);
      }

      return patient;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ErrorManager) {
        throw error;
      }
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async update(
    id: string,
    updatePatientDto: UpdatePatientDto
  ): Promise<Patient> {
    try {
      const patient = await this.getOne(id, false);
      if (updatePatientDto.email) {
        updatePatientDto.email = normalizeEmail(updatePatientDto.email);
      }
      const hasUniqueData = updatePatientDto.email || updatePatientDto.dni;

      if (hasUniqueData) {
        const orConditions = [];
        if (updatePatientDto.email)
          orConditions.push({ email: updatePatientDto.email });
        if (updatePatientDto.dni)
          orConditions.push({ dni: updatePatientDto.dni });

        if (orConditions.length > 0) {
          const conflictingPatient = await this.patientRepository.findOne({
            where: orConditions.map((condition) => ({
              ...condition,
              id: Not(id)
            }))
          });

          if (conflictingPatient) {
            let conflictingField = '';
            if (
              updatePatientDto.email &&
              conflictingPatient.email === updatePatientDto.email
            )
              conflictingField = 'email';
            else if (
              updatePatientDto.dni &&
              conflictingPatient.dni === updatePatientDto.dni
            )
              conflictingField = 'DNI';

            throw new ErrorManager(
              `Another patient already exists with the provided ${conflictingField}.`,
              409
            );
          }
        }

        const practitionerOrConditions = [];
        if (updatePatientDto.email)
          practitionerOrConditions.push({ email: updatePatientDto.email });

        if (practitionerOrConditions.length > 0) {
          const conflictingPractitioner =
            await this.practitionerRepository.findOne({
              where: practitionerOrConditions
            });

          if (conflictingPractitioner) {
            let conflictingField = '';
            if (
              updatePatientDto.email &&
              conflictingPractitioner.email === updatePatientDto.email
            )
              conflictingField = 'email';

            throw new ErrorManager(
              `A practitioner already exists with the provided ${conflictingField}.`,
              409
            );
          }
        }
      }

      const { socialWorkEnrollment: socialWorkEnrollmentPayload, ...updateData } = updatePatientDto;
      
      if (socialWorkEnrollmentPayload !== undefined) {
        if (socialWorkEnrollmentPayload === null) {
          patient.socialWorkEnrollment = null;
        } else if (typeof socialWorkEnrollmentPayload === 'string') {
          const enrollment = await this.socialWorkEnrollmentRepository.findOne({
             where: { id: socialWorkEnrollmentPayload },
             relations: ['patient']
          });
          if (!enrollment) {
            throw new NotFoundException(`SocialWorkEnrollment with ID ${socialWorkEnrollmentPayload} not found.`);
          }
          if (enrollment.patient && enrollment.patient.id !== id) {
            throw new BadRequestException(
              `SocialWorkEnrollment with ID ${socialWorkEnrollmentPayload} is already assigned to another patient.`
            );
          }
          enrollment.patient = patient;
          await this.socialWorkEnrollmentRepository.save(enrollment);

          patient.socialWorkEnrollment = enrollment;
        } else if (typeof socialWorkEnrollmentPayload === 'object') {
          const enrollmentDto = socialWorkEnrollmentPayload as CreateSocialWorkEnrollmentDto;
           if (!enrollmentDto.socialWork || !enrollmentDto.socialWork.id) {
            throw new BadRequestException('socialWork.id is required when creating/updating SocialWorkEnrollment.');
          }
          const socialWorkEntity = await this.socialWorkRepository.findOne({ where: { id: enrollmentDto.socialWork.id } });
          if (!socialWorkEntity) {
            throw new NotFoundException(`SocialWork with ID ${enrollmentDto.socialWork.id} not found.`);
          }

          if (enrollmentDto.id) {
            const targetEnrollment = await this.socialWorkEnrollmentRepository.findOne({
              where: { id: enrollmentDto.id },
            });
            if (!targetEnrollment) {
              throw new NotFoundException(`SocialWorkEnrollment with ID ${enrollmentDto.id} not found.`);
            }
            this.socialWorkEnrollmentRepository.merge(targetEnrollment, {
              ...enrollmentDto,
              socialWork: socialWorkEntity,
            });
            targetEnrollment.patient = patient;
            await this.socialWorkEnrollmentRepository.save(targetEnrollment);
            patient.socialWorkEnrollment = targetEnrollment;
          } else {
            const newEnrollment = this.socialWorkEnrollmentRepository.create({
              ...enrollmentDto,
              socialWork: socialWorkEntity,
            });
            newEnrollment.patient = patient;
            await this.socialWorkEnrollmentRepository.save(newEnrollment);
            patient.socialWorkEnrollment = newEnrollment;
          }
        }
      }
      
      // Solo hacer merge si hay datos para actualizar
      if (Object.keys(updateData).length > 0) {
        this.patientRepository.merge(patient, updateData as DeepPartial<Patient>);
      }

      const patientSaved = await this.patientRepository.save(patient);
      if (patientSaved?.socialWorkEnrollment && (patientSaved.socialWorkEnrollment as any).patient) {
        (patientSaved.socialWorkEnrollment as any).patient = undefined;
      }

      // Refrescar para incluir la relación del grupo familiar actualizada
      const refreshed = await this.patientRepository.findOne({ where: { id: patientSaved.id }, relations: ['familyGroup', 'socialWorkEnrollment'] });
      return refreshed ?? patientSaved;

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ErrorManager) {
        throw error;
      }
      throw ErrorManager.createSignatureError((error as Error).message || 'An unexpected error occurred during patient update');
    }
  }

  async softDelete(id: string): Promise<{ message: string; patient?: Patient }> {
    try {
      const patient = await this.patientRepository.findOne({ where: { id }, relations: ['familyGroup'] });
      if (!patient) throw new NotFoundException(`Paciente con ID ${id} no encontrado.`);

      await this.patientRepository.softRemove(patient);

      const deleted = await this.patientRepository.findOne({ where: { id }, withDeleted: true, relations: ['familyGroup'] });
      return { message: 'Paciente eliminado exitosamente.', patient: deleted };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async recover(id: string): Promise<{ message: string, patient?: Patient }> {
    try {
      const patient = await this.patientRepository.findOne({
        where: { id },
        withDeleted: true,
        relations: ['familyGroup']
      });

      if (!patient || !patient.deletedAt) {
        throw new NotFoundException(
          `Patient with ID ${id} not found or not deleted`
        );
      }

      await this.patientRepository.recover(patient);
      const recovered = await this.patientRepository.findOne({ where: { id }, relations: ['familyGroup'] });
      return { message: 'Patient recovered successfully',  patient: recovered };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async getByDocument(
    type: DocumentType,
    number: string,
    withFamilyMembers = false,
  ): Promise<SerializerPatientDto> {
    try {
      switch (type) {
        case DocumentType.DNI:
          if (!/^\d{7,8}$/.test(number)) {
            throw new ErrorManager(
              'Invalid DNI format. Must be 7 or 8 digits',
              400
            );
          }
          break;
        case DocumentType.PASSPORT:
          if (!/^[A-Za-z0-9]{6,12}$/.test(number)) {
            throw new ErrorManager('Invalid Passport format', 400);
          }
          break;
        default:
          throw new ErrorManager('Invalid document type', 400);
      }

      const qb = this.patientRepository
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.socialWorkEnrollment', 'socialWorkEnrollment')
      .leftJoinAndSelect('socialWorkEnrollment.socialWork', 'socialWork')
      .leftJoinAndSelect('patient.familyGroup', 'familyGroup')
      .where('patient.deletedAt IS NULL')
      .andWhere('patient.documentType = :type', { type })
      .andWhere('patient.dni = :number', { number });

      const patient = await qb.getOne();

      if (!patient) {
        throw new NotFoundException(`Patient with ${type} ${number} not found`);
      }

      if (withFamilyMembers && (patient as any).familyGroupId) {
        const members = await this.patientRepository.find({
          where: { familyGroupId: (patient as any).familyGroupId },
          relations: ['familyGroup']
        });
        (patient as any).familyMembers = members.filter(m => m.id !== patient.id);
      }

      return plainToInstance(SerializerPatientDto, patient);
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }
}
