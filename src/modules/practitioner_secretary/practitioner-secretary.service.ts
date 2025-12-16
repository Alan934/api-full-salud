import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../common/bases/base.service';
import {
  CreatePractitionerSecretaryDto,
  UpdatePractitionerSecretaryDto,
} from '../../domain/dtos';
import {
  Practitioner,
  Secretary,
  Location,
  PractitionerSecretary,
} from '../../domain/entities';
import { ErrorManager } from '../../common/exceptions/error.manager';

@Injectable()
export class PractitionerSecretaryService extends BaseService<
  PractitionerSecretary,
  CreatePractitionerSecretaryDto,
  UpdatePractitionerSecretaryDto
> {
  constructor(
    @InjectRepository(PractitionerSecretary)
    protected readonly repository: Repository<PractitionerSecretary>,

    @InjectRepository(Practitioner)
    private readonly practitionerRepository: Repository<Practitioner>,

    @InjectRepository(Secretary)
    private readonly secretaryRepository: Repository<Secretary>,

    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
  ) {
    super(repository);
  }

  async create(
    createDto: CreatePractitionerSecretaryDto,
  ): Promise<PractitionerSecretary> {
    try {
      const { practitioner, secretary, location } = createDto;

      const foundPractitioner = await this.practitionerRepository.findOne({
        where: { id: practitioner.id, deletedAt: null },
      });

      if (!foundPractitioner) {
        throw new ErrorManager(`Practitioner with ID ${practitioner.id} not found`, 404);
      }

      const foundSecretary = await this.secretaryRepository.findOne({
        where: { id: secretary.id, deletedAt: null },
      });

      if (!foundSecretary) {
        throw new ErrorManager(`Secretary with ID ${secretary.id} not found`, 404);
      }

      const foundLocation = await this.locationRepository.findOne({
        where: { id: location.id, deletedAt: null },
      });

      if (!foundLocation) {
        throw new ErrorManager(`Location with ID ${location.id} not found`, 404);
      }

      const newRelation = this.repository.create({
        practitioner: foundPractitioner,
        secretary: foundSecretary,
        location: foundLocation,
      });

      return await this.repository.save(newRelation);
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async getOne(id: string): Promise<PractitionerSecretary> {
    try {
      const result = await this.repository.findOne({
        where: { id, deletedAt: null },
        relations: ['practitioner', 'secretary', 'location'],
      });
      if (!result) throw new ErrorManager(`PractitionerSecretary with ID ${id} not found`, 404);
      return result;
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

}
