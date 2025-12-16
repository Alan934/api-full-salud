import { Controller, Post, Body, Get, Query, Param, Patch, UseGuards, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { TypeAppointmentService } from './type-appointment.service';
import { CreateTypeAppointmentDto } from '../../domain/dtos/type-appointment/type-appointment.dto';
import { SerializerTypeAppointmentDto } from '../../domain/dtos/type-appointment/type-appointment-serializer.dto';
import { toDto, toDtoList } from '../../common/util/transform-dto.util';
import { Role } from '../../domain/enums';
import { AuthGuard, Roles, RolesGuard } from '../auth/guards/auth.guard';
import { ApiPaginationResponse } from '../../common/swagger/api-pagination-response';
import { TypeAppointmentFilterDto } from '../../domain/dtos/type-appointment/type-appointment-filter.dto';

@ApiTags('Type Appointment')
@ApiBearerAuth('bearerAuth')
@Controller('type-appointment')
export class TypeAppointmentController {
  constructor(private readonly service: TypeAppointmentService) {}

  @Post()
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Create a new appointment type' })
  @ApiResponse({ status: 201, description: 'Type appointment created successfully', type: SerializerTypeAppointmentDto })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Type appointment with this name already exists' })
  async create(@Body() createDto: CreateTypeAppointmentDto): Promise<SerializerTypeAppointmentDto> {
    const entity = await this.service.create(createDto);
    return toDto(SerializerTypeAppointmentDto, entity);
  }

  @Get()
  @Roles(Role.ADMIN, Role.PRACTITIONER, Role.SECRETARY, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get all appointment types with optional filters' })
  @ApiResponse({ status: 200, description: 'List of appointment types retrieved successfully' })
  @ApiPaginationResponse(SerializerTypeAppointmentDto)
  async findAll(@Query() filterDto: TypeAppointmentFilterDto): Promise<{
    data: SerializerTypeAppointmentDto[];
    total: number;
    page: number;
    limit: number;
    lastPage: number;
  }> {
    const result = await this.service.findAllFiltered(filterDto);
    return {
      ...result,
      data: toDtoList(SerializerTypeAppointmentDto, result.data),
    };
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.PRACTITIONER, Role.SECRETARY)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get a specific appointment type by ID' })
  @ApiParam({ name: 'id', description: 'ID of the appointment type' })
  @ApiResponse({ status: 200, description: 'Appointment type found', type: SerializerTypeAppointmentDto })
  @ApiResponse({ status: 404, description: 'Appointment type not found' })
  async getOne(@Param('id') id: string): Promise<SerializerTypeAppointmentDto> {
    const entity = await this.service.getOne(id);
    return toDto(SerializerTypeAppointmentDto, entity);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Update an appointment type' })
  @ApiParam({ name: 'id', description: 'ID of the appointment type to update' })
  @ApiResponse({ status: 200, description: 'Appointment type updated successfully', type: SerializerTypeAppointmentDto })
  @ApiResponse({ status: 404, description: 'Appointment type not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: CreateTypeAppointmentDto
  ): Promise<SerializerTypeAppointmentDto> {
    const entity = await this.service.update(id, updateDto);
    return toDto(SerializerTypeAppointmentDto, entity);
  }

  @Delete('soft-delete/:id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Soft delete an appointment type' })
  @ApiParam({ name: 'id', description: 'ID of the appointment type to soft delete' })
  @ApiResponse({ status: 200, description: 'Appointment type soft deleted successfully' })
  @ApiResponse({ status: 404, description: 'Appointment type not found' })
  async softDelete(@Param('id') id: string): Promise<{ message: string }> {
    return this.service.softDelete(id);
  }

  @Patch('recover/:id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Recover a soft-deleted appointment type' })
  @ApiParam({ name: 'id', description: 'ID of the appointment type to recover' })
  @ApiResponse({ status: 200, description: 'Appointment type recovered successfully', type: SerializerTypeAppointmentDto })
  @ApiResponse({ status: 404, description: 'Appointment type not found' })
  async recover(@Param('id') id: string): Promise<SerializerTypeAppointmentDto> {
    const entity = await this.service.recover(id);
    return toDto(SerializerTypeAppointmentDto, entity);
  }
}