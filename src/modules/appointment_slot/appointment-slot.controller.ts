import { Controller, Get, Post, Put, Delete, Patch, Param, Body, Query, ParseUUIDPipe, UseGuards, BadRequestException } from '@nestjs/common';
import { AppointmentSlotService } from './appointment-slot.service';
import { AppointmentSlot } from '../../domain/entities';
import { ControllerFactory } from '../../common/factories/controller.factory';
import { CreateAppointmentSlotDto, UpdateAppointmentSlotDto, SerializerAppointmentSlotDto, SerializerShortAppointmentSlotDto, OptimizeSerializerAppointmentSlotDto } from '../../domain/dtos';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { toDto, toDtoList } from '../../common/util/transform-dto.util';
import { PaginationMetadata } from '../../common/util/pagination-data.util';
import { FilteredAppointmentSlotDto } from '../../domain/dtos/appointment-slot/FilteredAppointmentSlot.dto';
import { PaginationDto } from '../../common/dtos';
import {  AuthGuard, Roles, RolesGuard } from '../auth/guards/auth.guard';
import { Role } from '../../domain/enums';
import { User } from '../auth/decorators';
import { CurrentUser } from '../auth/interfaces/current-user.interface';

@ApiTags('AppointmentSlot')
@Controller('appointment-slot')
export class AppointmentSlotController {
  constructor(
    protected service: AppointmentSlotService
  ) {}

  @Roles(Role.ADMIN, Role.PRACTITIONER, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get()
  @ApiOperation({ summary: 'Obtener todos los appointment slots paginados' })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1, description: 'Número de página' })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 10, description: 'Límite de resultados por página' })
  @ApiResponse({ status: 200, description: 'Appointment slots obtenidos', type: SerializerAppointmentSlotDto, isArray: true })
  @ApiResponse({ status: 404, description: 'Appointment slots not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async findAll(
    @Query() paginationDto: PaginationDto
  ): Promise<{ data: SerializerAppointmentSlotDto[]; meta: PaginationMetadata }> {
    const { data, meta } = await this.service.findAll(paginationDto);
    return { data: toDtoList(SerializerAppointmentSlotDto, data), meta };
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('include-deletes')
  @ApiOperation({ summary: 'Obtener todos los appointment slots incluyendo eliminados' })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1, description: 'Número de página' })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 10, description: 'Límite de resultados por página' })
  @ApiResponse({ status: 200, description: 'Appointment slots obtenidos', type: SerializerAppointmentSlotDto, isArray: true })
  @ApiResponse({ status: 400, description: 'Invalid pagination parameters' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async findAllIncludeDeletes(
    @Query() paginationDto: PaginationDto
  ): Promise<{ data: SerializerAppointmentSlotDto[]; meta: PaginationMetadata }> {
    const { data, meta } = await this.service.findAllIncludeDeletes(paginationDto);
    return { data: toDtoList(SerializerAppointmentSlotDto, data), meta };
  }

  @Roles(Role.ADMIN, Role.PRACTITIONER, Role.SECRETARY)
  @UseGuards(AuthGuard, RolesGuard)
  @Get('filtered')
  @ApiOperation({ summary: 'Obtener appointment slots filtrados y paginados' })
  @ApiQuery({ name: 'day', type: String, required: false, description: 'Día de la semana (ejemplo: Monday)' })
  @ApiQuery({ name: 'allDays', type: Boolean, required: false, description: 'Si es true y se envía practitionerId, devuelve todos los horarios de todos los días sin filtrar por día' })
  @ApiQuery({ name: 'practitionerId', type: String, required: false, description: 'ID del médico para filtrar horarios' })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1, description: 'Número de página' })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 10, description: 'Límite de resultados por página' })
  @ApiResponse({ status: 200, description: 'Appointment slots obtenidos', isArray: true })
  @ApiResponse({ status: 400, description: 'Invalid pagination parameters' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async findAllFiltered(
    @Query() query: FilteredAppointmentSlotDto,
    @User() user: CurrentUser
  ): Promise<{ data: OptimizeSerializerAppointmentSlotDto[]; meta: PaginationMetadata; msg: string }> {
    if (typeof query.schedules === 'string') {
      try {
        query.schedules = JSON.parse(query.schedules);
      } catch {
        throw new BadRequestException('El parámetro schedules debe ser un JSON válido');
      }
    }

    const { data, meta, msg } = await this.service.findAllFiltered(query, { page: query.page, limit: query.limit });
    return { data: toDtoList(OptimizeSerializerAppointmentSlotDto, data), meta, msg };
  }

  @Roles(Role.ADMIN, Role.PRACTITIONER, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get(':id')
  @ApiOperation({ summary: 'Obtener un appointment slot por id' })
  @ApiParam({ name: 'id', description: 'UUID del appointment slot', type: String })
  @ApiResponse({ status: 200, description: 'Appointment slot encontrado', type: SerializerAppointmentSlotDto })
  @ApiResponse({ status: 404, description: 'Appointment slot not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ): Promise<SerializerAppointmentSlotDto> {
    const slot = await this.service.findOne(id);
    return toDto(SerializerAppointmentSlotDto, slot);
  }

  @Roles(Role.ADMIN, Role.PRACTITIONER, Role.SECRETARY)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Post()
  @ApiOperation({ summary: 'Crear un nuevo appointment slot' })
  @ApiResponse({ status: 201, description: 'Appointment slot creado', type: SerializerShortAppointmentSlotDto })
  @ApiResponse({ status: 400, description: 'Bad request' }) 
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async create(@Body() createDto: CreateAppointmentSlotDto): Promise<SerializerShortAppointmentSlotDto> {
    const slot = await this.service.createAppointmentSlot(createDto);
    return toDto(SerializerShortAppointmentSlotDto, slot);
  }

  @Roles(Role.ADMIN, Role.PRACTITIONER, Role.SECRETARY)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un appointment slot existente' })
  @ApiParam({ name: 'id', description: 'UUID del appointment slot', type: String })
  @ApiResponse({ status: 200, description: 'Appointment slot actualizado', type: SerializerShortAppointmentSlotDto })
  @ApiResponse({ status: 404, description: 'Appointment slot not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateDto: UpdateAppointmentSlotDto
  ): Promise<SerializerShortAppointmentSlotDto> {
    const updated = await this.service.update(id, updateDto);
    return toDto(SerializerShortAppointmentSlotDto, updated);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un appointment slot de forma permanente' })
  @ApiParam({ name: 'id', description: 'UUID del appointment slot', type: String })
  @ApiResponse({ status: 200, description: 'Appointment slot eliminado' })
  @ApiResponse({ status: 404, description: 'Appointment slot not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ): Promise<string> {
    return await this.service.remove(id);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Patch('soft-remove/:id')
  @ApiOperation({ summary: 'Soft delete de un appointment slot' })
  @ApiParam({ name: 'id', description: 'UUID del appointment slot', type: String })
  @ApiResponse({ status: 200, description: 'Appointment slot soft deleted' })
  @ApiResponse({ status: 404, description: 'Appointment slot not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async softRemove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ): Promise<string> {
    return await this.service.softRemove(id);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Patch('restore/:id')
  @ApiOperation({ summary: 'Restaurar un appointment slot soft deleted' })
  @ApiParam({ name: 'id', description: 'UUID del appointment slot', type: String })
  @ApiResponse({ status: 200, description: 'Appointment slot restaurado', type: SerializerShortAppointmentSlotDto })
  @ApiResponse({ status: 404, description: 'Appointment slot not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async restore(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ): Promise<SerializerShortAppointmentSlotDto> {
    const slot = await this.service.restore(id);
    return toDto(SerializerShortAppointmentSlotDto, slot);
  }
}