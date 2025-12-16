import { Controller } from '@nestjs/common';
import { ProcedureService } from './procedure.service';
import { Procedure } from '../../domain/entities';
import { ControllerFactory } from '../../common/factories/controller.factory';
import {
  CreateProcedureDto,
  SerializerprocedureDto,
  UpdateProcedureDto
} from '../../domain/dtos';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Procedure')
@Controller('procedure')
export class ProcedureController extends ControllerFactory<
  Procedure,
  CreateProcedureDto,
  UpdateProcedureDto,
  SerializerprocedureDto
>(Procedure, CreateProcedureDto, UpdateProcedureDto, SerializerprocedureDto) {
  constructor(protected service: ProcedureService) {
    super();
  }
}
