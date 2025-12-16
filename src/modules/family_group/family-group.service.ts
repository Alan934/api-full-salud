import { Injectable, NotFoundException, BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { FamilyGroup, Patient } from '../../domain/entities';
import { ErrorManager } from '../../common/exceptions/error.manager';
import { AuthService } from '../auth/auth.service';
import { CreateFamilyGroupDto } from '../../domain/dtos';

@Injectable()
export class FamilyGroupService {
  constructor(
    @InjectRepository(FamilyGroup) private readonly familyGroupRepository: Repository<FamilyGroup>,
    @InjectRepository(Patient) private readonly patientRepository: Repository<Patient>,
    @Inject(forwardRef(() => AuthService)) private readonly authService: AuthService
  ) {}

  async getFamilyHeads(page = 1, limit = 10) {
    try {
      const qb = this.patientRepository.createQueryBuilder('patient')
        .leftJoinAndSelect('patient.familyGroup', 'familyGroup')
        .leftJoinAndSelect('patient.socialWorkEnrollment', 'socialWorkEnrollment')
        .leftJoinAndSelect('socialWorkEnrollment.socialWork', 'socialWork')
        .where('patient.deletedAt IS NULL')
        .andWhere('familyGroup.headPatientId = patient.id')
        .orderBy('patient.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);
      const [data, total] = await qb.getManyAndCount();
      return { patients: data, total, page, limit };
    } catch (e) { throw ErrorManager.createSignatureError((e as Error).message); }
  }

  async getFamilyMembers(familyGroupId: string, page = 1, limit = 10) {
    try {
      const fg = await this.familyGroupRepository.findOne({ where: { id: familyGroupId, isActive: true } });
      if (!fg) throw new NotFoundException('Family group not found or inactive');
      const qb = this.patientRepository.createQueryBuilder('patient')
        .leftJoinAndSelect('patient.familyGroup', 'familyGroup')
        .leftJoinAndSelect('patient.socialWorkEnrollment', 'socialWorkEnrollment')
        .leftJoinAndSelect('socialWorkEnrollment.socialWork', 'socialWork')
        .where('patient.deletedAt IS NULL')
        .andWhere('patient.familyGroupId = :familyGroupId', { familyGroupId })
        .orderBy('patient.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);
      const [data, total] = await qb.getManyAndCount();
      return { patients: data, total, page, limit };
    } catch (e) { if (e instanceof NotFoundException) throw e; throw ErrorManager.createSignatureError((e as Error).message); }
  }

  async updateFamilyGroupRelations(patientId: string, dto: { familyGroupId?: string; headPatientId?: string; }) {
    try {
      return await this.familyGroupRepository.manager.transaction(async (manager) => {
        const patientRepo = manager.getRepository(Patient);
        const fgRepo = manager.getRepository(FamilyGroup);

        const patient = await patientRepo.findOne({ where: { id: patientId, deletedAt: null }, relations: ['familyGroup'] });
        if (!patient) throw new NotFoundException('Patient not found');

        if (dto.headPatientId) {
          // Ensure the head has a family group; creates one if missing
          const groupId = await this.ensureFamilyGroupForHead(dto.headPatientId, manager);
          patient.familyGroupId = groupId;
        } else if (dto.familyGroupId !== undefined) {
          if (dto.familyGroupId === null) {
            patient.familyGroupId = null;
          } else {
            const group = await fgRepo.findOne({ where: { id: dto.familyGroupId, isActive: true } });
            if (!group) throw new NotFoundException('Family group not found or inactive');
            patient.familyGroupId = dto.familyGroupId;
          }
        }

        return await patientRepo.save(patient);
      });
    } catch (e) {
      if (e instanceof NotFoundException || e instanceof BadRequestException) throw e;
      throw ErrorManager.createSignatureError((e as Error).message);
    }
  }

  async softDeleteCascade(id: string) {
    try {
      return await this.patientRepository.manager.transaction(async (manager) => {
        const patient = await manager.findOne(Patient, { 
          where: { id, deletedAt: null }, 
          relations: ['familyGroup'] 
        });
        
        if (!patient) {
          throw new NotFoundException('Patient not found');
        }

        let affected = 1;

        if (patient.familyGroup && patient.familyGroup.headPatientId === patient.id) {
          // Si es jefe de familia, eliminar todos los miembros
          const members = await manager.find(Patient, { 
            where: { familyGroupId: patient.familyGroup.id, deletedAt: null } 
          });
          
          // Soft delete todos los miembros
          for (const member of members) {
            await manager.softRemove(Patient, member);
          }
          
          // Desactivar el grupo familiar
          await manager.update(FamilyGroup, patient.familyGroup.id, { isActive: false });
          
          affected = members.length;
        } else {
          // Solo eliminar el paciente individual
          await manager.softRemove(Patient, patient);
        }

        return { 
          message: `Patient${affected > 1 ? 's' : ''} soft deleted successfully`, 
          affectedCount: affected,
          patientId: patient.id,
          familyGroupId: patient.familyGroup?.id || null
        };
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw ErrorManager.createSignatureError((error as Error).message);
    } 
  // finally {
  //     // Manejar imágenes después de la transacción para evitar problemas
  //     try {
  //       await this.handleUserImagesCleanup(id);
  //     } catch (imageError) {
  //       // Log del error pero no fallar la operación principal
  //       console.error('Error handling user images on delete:', imageError);
  //     }
  //   }
  }

  // private async handleUserImagesCleanup(patientId: string) {
  //   try {
  //     // Obtener el paciente con su grupo familiar para determinar si es jefe
  //     const patient = await this.patientRepository.findOne({
  //       where: { id: patientId },
  //       relations: ['familyGroup'],
  //       withDeleted: true
  //     });

  //     if (!patient) return;

  //     if (patient.familyGroup && patient.familyGroup.headPatientId === patient.id) {
  //       // Para jefe de familia, manejar imágenes de todos los miembros
  //       const members = await this.patientRepository.find({ 
  //         where: { familyGroupId: patient.familyGroup.id }, 
  //         withDeleted: true 
  //       });
  //       for (const member of members) {
  //         await this.authService.handleUserImageOnDelete(member.id, true);
  //       }
  //     } else {
  //       await this.authService.handleUserImageOnDelete(patientId, true);
  //     }
  //   } catch (error) {
  //     console.error('Error in handleUserImagesCleanup:', error);
  //   }
  // }

  async recoverCascade(id: string) {
    try {
      return await this.patientRepository.manager.transaction(async (manager) => {
        const patient = await manager.findOne(Patient, { 
          where: { id }, 
          relations: ['familyGroup'], 
          withDeleted: true 
        });
        
        if (!patient || !patient.deletedAt) {
          throw new NotFoundException('Patient not found or not deleted');
        }

        let affected = 1;

        if (patient.familyGroup && patient.familyGroup.headPatientId === patient.id) {
          // Si es jefe de familia, recuperar todos los miembros
          const members = await manager.find(Patient, { 
            where: { familyGroupId: patient.familyGroup.id }, 
            withDeleted: true 
          });
          
          // Recuperar todos los miembros eliminados
          for (const member of members) {
            if (member.deletedAt) {
              await manager.recover(Patient, member);
            }
          }
          
          // Reactivar el grupo familiar
          await manager.update(FamilyGroup, patient.familyGroup.id, { isActive: true });
          
          affected = members.length;
        } else {
          // Solo recuperar el paciente individual
          await manager.recover(Patient, patient);
        }

        return { 
          message: `Patient${affected > 1 ? 's' : ''} recovered successfully`, 
          affectedCount: affected,
          patientId: patient.id,
          familyGroupId: patient.familyGroup?.id || null
        };
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async createFamilyGroupForHead(headPatient: Patient, data: CreateFamilyGroupDto) {
    const group = this.familyGroupRepository.create({
      familyGroupName: data.familyGroupName,
      familyDescription: data.familyDescription,
      isActive: data.isActive ?? true,
      headPatientId: null // set after save head patient id
    });
    const saved = await this.familyGroupRepository.save(group);
    return saved;
  }

  async assignPatientAsHeadToGroup(groupId: string, headPatientId: string) {
    await this.familyGroupRepository.update(groupId, { headPatientId });
  }

  /**
   * Ensure that the given head patient has a FamilyGroup. If not, create one named
   * "Familia <lastName>" (active), assign the head as group head and member, and return the group id.
   * If a manager is provided, all operations will use it to participate in the caller transaction.
   */
  async ensureFamilyGroupForHead(headPatientId: string, manager?: EntityManager): Promise<string> {
    const patientRepo = manager ? manager.getRepository(Patient) : this.patientRepository;
    const fgRepo = manager ? manager.getRepository(FamilyGroup) : this.familyGroupRepository;

    const head = await patientRepo.findOne({ where: { id: headPatientId, deletedAt: null }, relations: ['familyGroup'] });
    if (!head) throw new NotFoundException('Paciente jefe de familia no encontrado');

    if (head.familyGroup?.id) return head.familyGroup.id;

    const lastName = head.lastName?.trim() || head.name?.trim() || 'Sin apellido';
    const group = fgRepo.create({
      familyGroupName: `Familia ${lastName}`,
      familyDescription: `Grupo familiar de ${head.name || ''} ${head.lastName || ''}`.trim(),
      isActive: true,
      headPatientId: head.id,
    });
    const savedGroup = await fgRepo.save(group);

    head.familyGroupId = savedGroup.id;
    await patientRepo.save(head);

    return savedGroup.id;
  }
}
