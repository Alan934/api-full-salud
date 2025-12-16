import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ControllerFactory } from '../../common/factories/controller.factory';
import { MedicationRequest } from '../../domain/entities/medication-request.entity';
import { toDto } from '../../common/util/transform-dto.util';
import { MedicationRequestsService } from './medication-request.service';
import { SerializerMedicationRequestDto } from '../../domain/dtos/medication-request/medication-request-serializer.dto';
import { CreateMedicationRequestDto, UpdateMedicationRequestDto } from '../../domain/dtos/medication-request/medication-request.dto';
import { FilteredMedicationRequestDto } from '../../domain/dtos/medication-request/FilteredMedicationRequest.dto';
import { AuthGuard, Roles, RolesGuard } from '../auth/guards/auth.guard';
import { Role } from '../../domain/enums';
import { ApiPaginationResponse } from '../../common/swagger/api-pagination-response';

@ApiTags('MedicationRequests')
@Controller('medication-request')
export class MedicationRequestsController  {
  constructor(protected service: MedicationRequestsService) {  }

  @Roles(Role.PRACTITIONER, Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('create')
  @ApiOperation({ summary: 'Crear una nueva receta' })
  @ApiBody({ type: CreateMedicationRequestDto })
  @ApiResponse({ type: SerializerMedicationRequestDto })
  @ApiResponse({ status: 201, description: 'practitionerRole created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' }) 
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async create(
    @Body() createMedicationRequestDto: CreateMedicationRequestDto
  ): Promise<SerializerMedicationRequestDto> {
    const data = await this.service.create(createMedicationRequestDto);
    return toDto(SerializerMedicationRequestDto, data);
  }

  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('by-doctor')
  @ApiOperation({
    summary: 'Obtener todas las recetas asociadas a un doctor, filtradas por periodo(day, week, month)'
  })
  @ApiResponse({status: 200, type: SerializerMedicationRequestDto, isArray: true })
  @ApiResponse({ status: 400, description: 'Bad request' }) 
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async findAllMedicationRequestByDoctorId(
    @Query('doctorId') doctorId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('period') period?: string
  ): Promise<{ data: SerializerMedicationRequestDto[]; total: number; lastPage: number}> {
    const { data, total, lastPage } = await this.service.findAllMedicationRequestByDoctorId(doctorId, page, limit, period);
    const serializedData = data.map((medication) => toDto(SerializerMedicationRequestDto, medication));
    return {
      data: serializedData,
      total,
      lastPage
    }
  }

  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('by-patient')
  @ApiOperation({
    summary: 'Obtener todas las recetas asociadas a un paciente'
  })
  @ApiResponse({ type: SerializerMedicationRequestDto, isArray: true })
  @ApiResponse({ status: 400, description: 'Bad request' }) 
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async findAllMedicationRequestByPatientId(
    @Query('patientId') patientId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit:  number = 10,
  ): Promise<{
    data:SerializerMedicationRequestDto[]; 
    total: number; 
    lastPage: number}> {
    const {data, total, lastPage} = await this.service.findAllMedicationRequestByPatientId(patientId, page, limit);
    const serializedData = data.map((medication)=> toDto(SerializerMedicationRequestDto, medication))
    return {
      data: serializedData,
      total, lastPage
    };
  }

  @Roles(Role.PRACTITIONER, Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una receta existente' })
  @ApiBody({ type: UpdateMedicationRequestDto })
  @ApiResponse({ type: SerializerMedicationRequestDto })
  @ApiResponse({ status: 400, description: 'Bad request' }) 
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async updateMedicationRequest(
    @Param('id') id: string,
    @Body() updateMedicationRequestDto: UpdateMedicationRequestDto
  ): Promise<SerializerMedicationRequestDto> {
    const data = await this.service.update(id, updateMedicationRequestDto);
    return toDto(SerializerMedicationRequestDto, data);
  }

  @Roles(Role.PRACTITIONER, Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Delete('/remove/:id')
  @ApiOperation({ description: 'Eliminar (soft delete) de Medicine Request' })
  @ApiParam({ name: 'id', description: 'UUID del Medicine Request', type: String })
  @ApiResponse({ status: 200, description: 'Medicine Request eliminado correctamente', schema: { example: { message: 'Favorito deleted successfully', deletedFavorito: { /* ejemplo del turno */ } } } })
  @ApiResponse({ status: 404, description: 'Medicine Request no encontrado' })
  @ApiResponse({ status: 400, description: 'Bad request' }) 
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async removeMedicineRequest(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<{ message: string; deletedMedicationRequest: MedicationRequest }> {
    return this.service.removeMedicineRequest(id);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Patch('/recover/:id')
  @ApiPaginationResponse(SerializerMedicationRequestDto)
  @ApiOperation({ description: 'Recuperar (soft delete) de Medication Request' })
  @ApiParam({ name: 'id', description: 'UUID del Medication Request', type: String })
  @ApiResponse({ status: 200, description: 'Medication Request recuperado correctamente', schema: { example: { message: 'Favorito deleted successfully', deletedFavorito: { /* ejemplo del turno */ } } } })
  @ApiResponse({ status: 404, description: 'Medication Request no encontrado' })
  @ApiResponse({ status: 400, description: 'Bad request' }) 
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async recoverMedicationRequest(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<{ message: string; medicationRequestRecovered: MedicationRequest }> {
    return this.service.recoverMedicineRequest(id);
  }

  //TODO find filtered paginated
  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiPaginationResponse(SerializerMedicationRequestDto)
  @Get()
  @ApiOperation({
    summary: 'Obtener todas las recetas filtradas'
  })
  @ApiResponse({ type: SerializerMedicationRequestDto, isArray: true })
  @ApiResponse({ status: 400, description: 'Bad request' }) 
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  // @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Fecha inicial'})
  // @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Fecha final'})
  async findAllFiltered(
    @Query() filteredDto: FilteredMedicationRequestDto,
  ): Promise<{
    data:SerializerMedicationRequestDto[]; 
    total: number; 
    lastPage: number,  msg:string}> {
    const {data, total, lastPage, msg} = await this.service.findAllPaginated(filteredDto);
    const serializedData = data.map((medication)=> toDto(SerializerMedicationRequestDto, medication))
    return {
      data: serializedData,
      total, lastPage, msg
    };
  }
}
