import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrescriptionService } from './prescription.service';
import {
  CreatePrescriptionDto,
  SerializerPrescriptionDto,
  UpdatePrescriptionDto
} from '../../domain/dtos';
import { AuthGuard, Roles, RolesGuard } from '../auth/guards/auth.guard';
import { Role } from '../../domain/enums';
import { toDto, toDtoList } from '../../common/util/transform-dto.util';
import { ApiPaginationResponse } from '../../common/swagger/api-pagination-response';
import { PrescriptionFilteredPaginationDto } from '../../domain/dtos/prescription/prescriptionFilteredPaginationDto';

@ApiTags('Prescription')
@Controller('prescription')
export class PrescriptionController {
  constructor(protected service: PrescriptionService) { }
  @Post()
  @Roles(Role.ADMIN, Role.PRACTITIONER)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Create a new Prescription',
    description: 'Create a new Prescription'
   })
  @ApiResponse({
    status: 201,
    description: 'The created Prescription',
    type: SerializerPrescriptionDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Social work or practitioner role not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async create(@Body() createDto: CreatePrescriptionDto): Promise<SerializerPrescriptionDto> {
    const entity = await this.service.create(createDto);
    return toDto(SerializerPrescriptionDto, entity);
  }

  @Get()
  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.SECRETARY, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Get all Prescriptions with optional filtering and pagination',
    description: 'Retrieve a list of Prescriptions filtered by patient, practitioner, or date with pagination.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  @ApiPaginationResponse(SerializerPrescriptionDto)
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiQuery({ name: 'patientId', required: false, type: String, description: 'Filter by Patient ID' })
  @ApiQuery({ name: 'practitionerId', required: false, type: String, description: 'Filter by Practitioner ID' })
  @ApiQuery({ name: 'date', required: false, type: String, description: 'Filter by date (yyyy-mm-dd)' })
  async findAllPaginated(
    @Query() filterPaginationDto: PrescriptionFilteredPaginationDto,
  ): Promise<{ data: SerializerPrescriptionDto[]; lastPage: number; total: number; msg?: string }> {
    const { data, lastPage, total, msg } = await this.service.findAllPaginated(filterPaginationDto);
    const serializedData = toDtoList(SerializerPrescriptionDto, data);
    return { data: serializedData, total, lastPage, msg };
  }

  @Get(':id')
  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.SECRETARY, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Get a specific Prescription by ID' })
  @ApiResponse({ status: 404, description: 'Prescription not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  @ApiParam({ name: 'id', description: 'Prescription ID' })
  @ApiResponse({
    status: 200,
    description: 'The requested Prescription',
    type: SerializerPrescriptionDto
  })
  async getOne(@Param('id') id: string): Promise<SerializerPrescriptionDto> {
    const entity = await this.service.getOne(id);
    return toDto(SerializerPrescriptionDto, entity);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.PRACTITIONER)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Update an existing Prescription by ID' })
  @ApiParam({ name: 'id', description: 'Prescription ID to update' })
  @ApiResponse({
    status: 200,
    description: 'The updated Prescription',
    type: SerializerPrescriptionDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Prescription not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePrescriptionDto,
  ): Promise<SerializerPrescriptionDto> {
    const entity = await this.service.update(id, updateDto);
    return toDto(SerializerPrescriptionDto, entity);
  }

  @Delete('soft-delete/:id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Soft delete a Prescription' })
  @ApiParam({ name: 'id', description: 'Prescription ID to soft delete' })
  @ApiResponse({
    status: 200,
    description: 'Message confirming soft deletion',
    schema: { example: { message: 'Prescription with ID "..." soft deleted successfully' } },
  })
  @ApiResponse({ status: 404, description: 'Prescription not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async softDelete(@Param('id') id: string): Promise<{ message: string }> {
    return this.service.softDeleted(id);
  }

  @Patch('recover/:id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Recover a soft-deleted Prescription' })
  @ApiParam({ name: 'id', description: 'Prescription ID to recover' })
  @ApiResponse({
    status: 200,
    description: 'The recovered Prescription',
    type: SerializerPrescriptionDto,
  })
  @ApiResponse({ status: 404, description: 'Prescription not found' })
  @ApiResponse({ status: 400, description: 'Prescription is not soft-deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async recover(@Param('id') id: string): Promise<SerializerPrescriptionDto> {
    const entity = await this.service.recover(id);
    return toDto(SerializerPrescriptionDto, entity);
  }


}
