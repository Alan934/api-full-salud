import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Get,
  Query,
  BadRequestException,
  NotFoundException,
  UseGuards
} from '@nestjs/common';
import 'multer';
import { AppointmentService } from './appointment.service';
import {
  CreateAppointmentDto,
  SerializerAppointmentDto,
  UpdateAppointmentDto,
  OptimizeAppointmentDto,
  SecondOptimizeAppointmentDto,
  ReprogramAppointmentDto,
  AvailableDayDto
} from '../../domain/dtos';
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiCreatedResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery
} from '@nestjs/swagger';
import { toDto, toDtoList } from '../../common/util/transform-dto.util';
import { AuthGuard, Roles, RolesGuard } from '../auth/guards/auth.guard';
import { AppointmentStatus, Role } from '../../domain/enums';
import { ControllerFactory } from '../../common/factories/controller.factory';
import { Appointment } from '../../domain/entities';
import { ApiPaginationResponse } from '../../common/swagger/api-pagination-response';
import { plainToInstance } from 'class-transformer';
import { User } from '../auth/decorators';
import { CurrentUser } from '../auth/interfaces/current-user.interface';

@ApiTags('Appointment')
@Controller('appointment')
@ApiBearerAuth('bearerAuth')
export class AppointmentController {
  constructor(protected service: AppointmentService) { }

  @Get('patient/:dni/practitioner/:practitionerId')
  @ApiOperation({ summary: 'Get all appointments for a patient by DNI and practitioner ID', description: 'Retrieve all appointments from today onwards for a specific patient and practitioner' })
  @ApiParam({ name: 'dni', description: 'Patient DNI', type: String, example: '12345678' })
  @ApiParam({ name: 'practitionerId', description: 'Practitioner ID (UUID)', type: String, example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({ status: 200, description: 'List of appointments found', type: [OptimizeAppointmentDto] })
  @ApiResponse({ status: 404, description: 'No appointments found for the given DNI and practitioner' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async getTurnsByDniAndPractitioner(
    @Param('dni') dni: string,
    @Param('practitionerId', new ParseUUIDPipe()) practitionerId: string
  ): Promise<OptimizeAppointmentDto[]> {
    const appointments = await this.service.getTurnsByDniAndPractitioner(
      dni,
      practitionerId
    );
    return toDtoList(OptimizeAppointmentDto, appointments);
  }


  @Post()
  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.SECRETARY, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ 
    summary: 'Create a new appointment', 
    description: 'Creates a new appointment with automatic slot/schedule resolution. You can provide either an existing patient ID or patient data to create a new patient. The system automatically finds the appropriate slot and schedule based on practitioner, date, and hour if not explicitly provided. Set SocialWork to null or omit it if there is no social work (particular).'
  })
  @ApiBody({ 
    type: CreateAppointmentDto, 
    description: 'Appointment creation data. Provide either "patientId" for existing patient or "patient" object to create new patient. slotId and scheduleId are optional and will be auto-resolved.',
    examples: {
      simpleAppointment: {
        summary: 'Simple appointment (auto-resolution)',
        description: 'Create appointment with automatic slot/schedule resolution',
        value: {
          date: '2025-08-21',
          hour: '14:30',
          practitionerId: '550e8400-e29b-41d4-a716-446655440000',
          patientId: 'e9bde426-056a-4fde-90a7-26ba40a8c154',
          observation: 'Consulta de rutina',
        }
      },
      newPatientAppointment: {
        summary: 'Appointment with new patient (auto-resolution)',
        description: 'Create appointment and new patient with automatic slot/schedule resolution',
        value: {
          date: '2025-08-21',
          hour: '14:30',
          practitionerId: '550e8400-e29b-41d4-a716-446655440000',
          patient: {
            email: 'juan.perez@email.com',
            name: 'Juan',
            lastName: 'Pérez',
            dni: '12345678',
            phone: '2615836294',
            birth: '1990-05-15'
          },
          observation: 'Primera consulta',
        }
      },
      explicitIdsAppointment: {
        summary: 'Appointment with explicit slot/schedule IDs',
        description: 'Create appointment with manually specified slot and schedule IDs',
        value: {
          slotId: 'f479d8de-d255-4350-99fc-340a48cde4dd',
          scheduleId: '24836f5a-86ad-4898-a056-f759fc6d7cee',
          date: '2025-08-21',
          hour: '14:30',
          practitionerId: '550e8400-e29b-41d4-a716-446655440000',
          patientId: 'e9bde426-056a-4fde-90a7-26ba40a8c154',
          observation: 'Consulta con IDs específicos',
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'The appointment has been successfully created. If patient data was provided and a patient with the same DNI/email exists, the existing patient is used. Slot and schedule are automatically resolved if not provided.', 
    type: SerializerAppointmentDto 
  })
  @ApiResponse({ status: 400, description: 'Invalid input data, appointment overlap, no availability found, or both patientId and patient data provided' })
  @ApiResponse({ status: 404, description: 'Patient, Practitioner, Slot, or Schedule not found' })
  async createTurnWithPatient(
    @Body() createTurnDto: CreateAppointmentDto,
    @User() user: CurrentUser
  ): Promise<SerializerAppointmentDto> {
    const turn = await this.service.createTurn(createTurnDto);
    return plainToInstance(SerializerAppointmentDto, turn, { excludeExtraneousValues: true, enableImplicitConversion: true });
  }  

  @Get()
  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.SECRETARY, Role.PATIENT)
  @ApiBearerAuth('bearerAuth')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Get all appointments with pagination',
    description: 'Retrieves a paginated list of all appointments'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)'
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)'
  })
  @ApiPaginationResponse(SerializerAppointmentDto)
  @ApiResponse({
    status: 200,
    description: 'Paginated list of Appointments retrieved successfully'
  })
  @ApiResponse({ status: 400, description: 'Invalid pagination parameters' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async getAllTurns(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ): Promise<{
    total: number;
    page: number;
    limit: number;
    previousPage: number | null;
    turns: SerializerAppointmentDto[];
  }> {
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const { turns, total, previousPage } = await this.service.getAll(
      pageNumber,
      limitNumber
    );
    return {
      turns: turns.map((turn) => toDto(SerializerAppointmentDto, turn)),
      total,
      page: pageNumber,
      limit: limitNumber,
      previousPage
    };
  }

  @Get(':id')
  @ApiOperation({   summary: 'Obtener un turno por su ID', description: 'Obtener un turno por su ID' })
  @ApiParam({ name: 'id', description: 'UUID del turno', type: String })
  @ApiResponse({
    status: 200,
    description: 'Turno encontrado',
    type: SecondOptimizeAppointmentDto
  })
  @ApiResponse({ status: 404, description: 'Turno no encontrado' })
  async getTurnById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<SecondOptimizeAppointmentDto> {
      const turn = await this.service.getOne(id);
    return toDto(SecondOptimizeAppointmentDto, turn);
  }

  @Get('specialist/:specialistId')
  @ApiOperation({
    summary:
      'Obtener todos los turnos futuros (hasta 6 meses) de un practitioner por estado PENDING, APPROVED, NO_SHOW'
  })
  @ApiResponse({
    status: 200,
    description: 'Turnos encontrados',
    type: [OptimizeAppointmentDto]
  })
  @ApiResponse({
    status: 204,
    description: 'No se encontraron turnos'
  })
  async getTurnsBySpecialist(
    @Param('specialistId', new ParseUUIDPipe({ version: '4' }))
    specialistId: string
  ): Promise<OptimizeAppointmentDto[]> {
    const appointments = await this.service.getTurnsBySpecialist(specialistId);
    return toDtoList(OptimizeAppointmentDto, appointments);
  }

  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @Get('specialist-all/:specialistId')
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary:
      'Obtener turnos por el ID de un especialista con paginación, exluyendo estado no_show'
  })
  @ApiParam({
    name: 'specialistId',
    description: 'UUID del especialista',
    type: String
  })
  @ApiResponse({
    status: 200,
    description: 'Turnos encontrados',
    type: [SerializerAppointmentDto]
  })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async getTurnsBySpecialistAll(
    @Param('specialistId', new ParseUUIDPipe({ version: '4' }))
    specialistId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ): Promise<{
    total: number;
    page: number;
    limit: number;
    previousPage: number | null;
    turns: SerializerAppointmentDto[];
  }> {
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const { turns, total, previousPage } =
      await this.service.getTurnsBySpecialistAll(
        specialistId,
        pageNumber,
        limitNumber
      );
    return {
      turns: turns.map((turn) => toDto(SerializerAppointmentDto, turn)),
      total,
      page: pageNumber,
      limit: limitNumber,
      previousPage
    };
  }

  @Roles(Role.PRACTITIONER, Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @Get('stats/:specialistId')
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary:
      'Obtener estadísticas de turnos para un especialista, filtradas por periodo (opcional: week omonth o year)'
  })
  @ApiParam({
    name: 'specialistId',
    description: 'UUID del especialista',
    type: String
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas de turnos obtenidas correctamente',
    schema: {
      example: {
        completedStats: { count: 10, percentage: 50 },
        canceledStats: { count: 10, percentage: 50 },
        totalTurns: 20,
        period: { start: '2024-03-01', end: '2024-04-01' }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async getTurnStatsForSpecialist(
    @Param('specialistId', new ParseUUIDPipe({ version: '4' }))
    specialistId: string,
    @Query('period') period?: 'month' | 'year'
  ): Promise<{
    completedStats: { count: number; percentage: number };
    canceledStats: { count: number; percentage: number };
    totalTurns: number;
    period?: { start: string; end: string };
  }> {
    const stats = await this.service.getTurnStatsForSpecialist(
      specialistId,
      period
    );
    return stats;
  }

  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @Get('patient/:patientId')
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Obtener turnos por el ID de un paciente con paginación'
  })
  @ApiParam({
    name: 'patientId',
    description: 'UUID del paciente',
    type: String
  })
  @ApiResponse({
    status: 200,
    description: 'Turnos encontrados',
    type: [SerializerAppointmentDto]
  })
  @ApiResponse({
    status: 404,
    description: 'No se encontraron turnos para el paciente'
  })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async getTurnsByPatient(
    @Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ): Promise<{
    total: number;
    page: number;
    limit: number;
    previousPage: number | null;
    turns: SerializerAppointmentDto[];
  }> {
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const { turns, total, previousPage } = await this.service.getTurnsByPatient(
      patientId,
      pageNumber,
      limitNumber
    );
    return {
      turns: turns.map((turn) => toDto(SerializerAppointmentDto, turn)),
      total,
      page: pageNumber,
      limit: limitNumber,
      previousPage
    };
  }

  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.SECRETARY, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @Get('patient-all/:patientId')
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Obtener turnos por el ID de un paciente con paginación, con filtros.' })
  @ApiParam({ name: 'patientId', description: 'UUID del paciente', type: String })
  @ApiQuery({
    name: 'practitionerName',
    required: false,
    description: 'Name or LastName of the practitioner, if not provided returns all associated practitioners. '
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Appointment Status: pending, under_review, approved, cancelled, completed, no_show. If not provided returns all status except no_show. '
  })
  @ApiQuery({
    name: 'profession',
    required: false,
    description: 'Profession name of practitioner, if not provided returns all asociated practitioners. '
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date in format YYYY-MM-DD (default: 7 days ago)'
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date in format YYYY-MM-DD (default: today)'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiResponse({ status: 200, description: 'Turnos encontrados', type: [SerializerAppointmentDto] })
  @ApiResponse({ status: 404, description: 'No se encontraron turnos para el paciente' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async getTurnsByPatientAll(
    @Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, 
    @Query('practitionerName') practitionerName?: string,
    @Query('status') status?: AppointmentStatus,
    @Query('profession') profession?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page: string = '1', 
    @Query('limit') limit: string = '10',
  ): Promise<{ total: number; page: number; limit: number; previousPage: number | null; turns: SerializerAppointmentDto[]; }> {
    const pageNumber = Number(page), limitNumber = Number(limit);
    const { turns, total, previousPage } = await this.service.getTurnsByPatientAll(patientId, practitionerName, status, profession, startDate, endDate, pageNumber, limitNumber);
    return { turns: turns.map((turn) => toDto(SerializerAppointmentDto, turn)), total, page: pageNumber, limit: limitNumber, previousPage };
  }

  @Roles(Role.PRACTITIONER, Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @Get('completed/patient/:patientId')
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary:
      'Obtener turnos completados por el ID de un paciente con paginación'
  })
  @ApiParam({
    name: 'patientId',
    description: 'UUID del paciente',
    type: String
  })
  @ApiResponse({
    status: 200,
    description: 'Turnos completados encontrados',
    type: [SerializerAppointmentDto]
  })
  @ApiResponse({
    status: 404,
    description: 'No se encontraron turnos completados para el paciente'
  })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async getCompletedTurnsByPatient(
    @Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ): Promise<{
    total: number;
    page: number;
    limit: number;
    previousPage: number | null;
    turns: SerializerAppointmentDto[];
  }> {
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const { turns, total, previousPage } =
      await this.service.getCompletedTurnsByPatient(
        patientId,
        pageNumber,
        limitNumber
      );
    return {
      turns: turns.map((turn) => toDto(SerializerAppointmentDto, turn)),
      total,
      page: pageNumber,
      limit: limitNumber,
      previousPage
    };
  }

  @Patch('/cancel/:id')
  @ApiOperation({ summary: 'Eliminar (soft delete) un turno' })
  @ApiParam({ name: 'id', description: 'UUID del turno', type: String })
  @ApiResponse({
    status: 200,
    description: 'Turno eliminado correctamente',
    schema: {
      example: {
        message: 'Turn deleted successfully',
        deletedTurn: {
          /* ejemplo del turno */
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Turno no encontrado' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async removeTurn(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ): Promise<{ message: string }> {
    return this.service.removeTurn(id, null);
  }

  @Patch('/reprogram/:id')
  @ApiOperation({ summary: 'Reprogramar un turno', description: 'Cambia la fecha y hora del turno manteniendo el mismo profesional. Requiere enviar slotId y scheduleId válidos del mismo profesional.' })
  @ApiParam({ name: 'id', description: 'UUID del turno', type: String })
  @ApiBody({
    type: ReprogramAppointmentDto ,
    description: 'Datos para reprogramar: nueva fecha (YYYY-MM-DD), hora (HH:MM), slotId y scheduleId del mismo practitioner'
  })
  @ApiResponse({ status: 200, description: 'Turno reprogramado correctamente', type: SerializerAppointmentDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos o superposición de turnos' })
  @ApiResponse({ status: 404, description: 'Turno/Slot/Schedule no encontrado' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async reprogramTurn(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ReprogramAppointmentDto
  ): Promise<{ turn: SerializerAppointmentDto }> {
    const turn = await this.service.reprogramTurn(id, dto);
    return { turn: toDto(SerializerAppointmentDto, turn) };
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @Patch('/recover/:id')
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Recuperar un turno eliminado' })
  @ApiParam({ name: 'id', description: 'UUID del turno', type: String })
  @ApiResponse({
    status: 200,
    description: 'Turno recuperado correctamente',
    type: SerializerAppointmentDto
  })
  @ApiResponse({ status: 404, description: 'Turno no encontrado' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async recoverTurn(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ): Promise<SerializerAppointmentDto> {
    const turn = await this.service.recoverTurn(id);
    return toDto(SerializerAppointmentDto, turn);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un turno' })
  @ApiParam({ name: 'id', description: 'UUID del turno', type: String })
  @ApiBody({ type: UpdateAppointmentDto })
  @ApiResponse({
    status: 200,
    description: 'Turno actualizado correctamente',
    type: SerializerAppointmentDto
  })
  @ApiResponse({ status: 404, description: 'Turno no encontrado' })
  async updateTurn(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateTurnDto: UpdateAppointmentDto
  ): Promise<SerializerAppointmentDto> {
    const turn = await this.service.updateTurn(id, updateTurnDto);
    return toDto(SerializerAppointmentDto, turn);
  }

  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @Patch('check-overlap/:id')
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Verificar superposición y actualizar un turno' })
  @ApiParam({ name: 'id', description: 'UUID del turno', type: String })
  @ApiBody({ type: UpdateAppointmentDto })
  @ApiResponse({
    status: 200,
    description: 'Turno actualizado correctamente',
    type: SerializerAppointmentDto
  })
  @ApiResponse({
    status: 400,
    description: 'Superposición de turnos o datos inválidos'
  })
  @ApiResponse({ status: 404, description: 'Turno no encontrado' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async checkOverlapAndUpdateTurn(
    @Param('id') id: string,
    @Body() updateTurnDto: UpdateAppointmentDto
  ): Promise<SerializerAppointmentDto> {
    try {
      const updatedTurn = await this.service.checkOverlapAndUpdateTurn(
        id,
        updateTurnDto
      );
      return updatedTurn;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to update turn');
    }
  }

  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.SECRETARY, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @Get('available/practitioner/:practitionerId')
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Obtener turnos disponibles de un practitioner de un día',
    description: `Devuelve todas las horas disponibles de una fecha para un practitioner. 
      Incluye slotId y scheduleId necesarios para reservar. Si el schedule tiene overtimeStartHour configurado, solo se devolverán los horarios normales (entre openingHour y overtimeStartHour), excluyendo los sobreturnos. 
      Si se pasa typeAppointmentId, valida las disponibilidades del tipo de turno:
      - Si el tipo no tiene availability → se considera disponible cualquier día/horario.
      - Si tiene availability → se devuelven solo los turnos que coincidan con el día y rango horario configurado.
      Si no se envía fecha, por defecto se trae los turnos de hoy.`
  })
  @ApiParam({ name: 'practitionerId', description: 'UUID del practitioner', type: String })
  @ApiQuery({ name: 'date', required: false, description: 'Fecha en formato YYYY-MM-DD. Por defecto: hoy' })
  @ApiQuery({ name: 'typeAppointmentId', required: false, description: 'UUID del tipo de turno (opcional)' })
  @ApiResponse({ status: 200, description: 'Disponibilidad obtenida correctamente', type: AvailableDayDto })
  @ApiResponse({ status: 400, description: 'Formato de fecha inválido' })
  @ApiResponse({ status: 404, description: 'Practitioner no encontrado' })
  async getAvailableAppointments(
    @Param('practitionerId', new ParseUUIDPipe({ version: '4' })) practitionerId: string,
    @Query('date') date?: string,
    @Query('typeAppointmentId') typeAppointmentId?: string
  ): Promise<AvailableDayDto> {
    const result = await this.service.getAvailableAppointments(practitionerId, date, typeAppointmentId);
    return result as AvailableDayDto;
  }

}
