import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ProfessionalDegreeService } from './professional-degree.service';
import { ControllerFactory } from '../../common/factories/controller.factory';
import {
  CreateProfessionalDegreeDto,
  UpdateProfessionalDegreeDto,
  SerializerProfessionalDegreeDto,
  ProfessionalDegreeFilteredPaginationDto
} from '../../domain/dtos';
import { ProfessionalDegree } from '../../domain/entities';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../auth/guards/auth.guard';
import { Role } from '../../domain/enums';
import { AuthGuard, RolesGuard } from '../auth/guards/auth.guard';
import { UseGuards } from '@nestjs/common';
import { toDto, toDtoList } from '../../common/util/transform-dto.util';
import { ApiPaginationResponse } from '../../common/swagger/api-pagination-response';

@ApiTags('Professional Degree')
@Controller('professional-degree')
export class ProfessionalDegreeController  {
  constructor(private readonly service: ProfessionalDegreeService) {
  }

  @Post()
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Create a new professional degree', description: 'Create a new professional degree' })
  @ApiResponse({
    status: 201,
    description: 'The created professional degree',
    type: SerializerProfessionalDegreeDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data or degree already exists' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async create(@Body() createDto: CreateProfessionalDegreeDto): Promise<SerializerProfessionalDegreeDto> {
    const entity = await this.service.create(createDto);
    return toDto(SerializerProfessionalDegreeDto, entity);
  }

  @Get()
  @Roles(Role.ADMIN, Role.PRACTITIONER, Role.SECRETARY)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Get all professional degrees with optional filtering and pagination',
    description: 'Get all professional degrees with optional filtering and pagination'
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  @ApiPaginationResponse(SerializerProfessionalDegreeDto)
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiQuery({ 
    name: 'professionalDegree', 
    required: false, 
    type: String, 
    description: 'Filter by professional degree name (partial match)' 
  })
  async findAllPaginated(
    @Query() filterPaginationDto: ProfessionalDegreeFilteredPaginationDto,
  ): Promise<{ data: SerializerProfessionalDegreeDto[]; lastPage: number; total: number; msg?: string }> {
    const { data, lastPage, total, msg } = await this.service.findAllPaginated(filterPaginationDto);
    const serializedData = toDtoList(SerializerProfessionalDegreeDto, data);
    return { data: serializedData, total, lastPage, msg };
  }

  @Get('in-use')
  @Roles(Role.ADMIN, Role.SECRETARY, Role.PRACTITIONER, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'List all professions associated with at least one practitioner. ',
    description: 'Returns a list of all Profession entities that are assigned to at least one practitioner. No pagination. Accessible to any role.'
  })
  async getAllUsedByPractitioners(
  ): Promise<SerializerProfessionalDegreeDto[] > {
    const degrees = await this.service.getAllUsedByPractitioners();
    const serializedData = toDtoList(SerializerProfessionalDegreeDto, degrees);
    return serializedData;
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.PRACTITIONER, Role.SECRETARY)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Get a specific professional degree by ID', description: 'Get a specific professional degree by ID' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  @ApiParam({ name: 'id', description: 'Professional degree ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'The requested professional degree',
    type: SerializerProfessionalDegreeDto
  })
  @ApiResponse({ status: 404, description: 'Professional degree not found' })
  async getOne(@Param('id') id: string): Promise<SerializerProfessionalDegreeDto> {
    const entity = await this.service.getOne(id);
    return toDto(SerializerProfessionalDegreeDto, entity);
  }

  @Get('name/:name')
  @Roles(Role.ADMIN, Role.PRACTITIONER, Role.SECRETARY)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Get professional degrees by name', description: 'Get professional degrees by name' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  @ApiParam({ name: 'name', description: 'Professional degree name to search for' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of professional degrees matching the name',
    type: [SerializerProfessionalDegreeDto]
  })
  @ApiResponse({ status: 404, description: 'No professional degrees found with this name' })
  async getByName(@Param('name') name: string): Promise<SerializerProfessionalDegreeDto[]> {
    const entities = await this.service.getByProfessionalDegree(name);
    return toDtoList(SerializerProfessionalDegreeDto, entities);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Update an existing professional degree', description: 'Update an existing professional degree' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  @ApiParam({ name: 'id', description: 'ID of the professional degree to update' })
  @ApiResponse({
    status: 200,
    description: 'The updated professional degree',
    type: SerializerProfessionalDegreeDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data or name already exists' })
  @ApiResponse({ status: 404, description: 'Professional degree not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateProfessionalDegreeDto,
  ): Promise<SerializerProfessionalDegreeDto> {
    const entity = await this.service.update(id, updateDto);
    return toDto(SerializerProfessionalDegreeDto, entity);
  }

  @Patch('soft-delete/:id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Soft delete a professional degree', description: 'Soft delete a professional degree' })
  @ApiParam({ name: 'id', description: 'ID of the professional degree to soft delete' })
  @ApiResponse({
    status: 200,
    description: 'Message confirming soft deletion',
    schema: { example: { message: 'Professional degree with ID "..." soft deleted successfully' } },
  })
  @ApiResponse({ status: 404, description: 'Professional degree not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async softDelete(@Param('id') id: string): Promise<{ message: string }> {
    return this.service.softDelete(id);
  }

  @Patch('recover/:id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Recover a soft-deleted professional degree', description: 'Recover a soft-deleted professional degree'})
  @ApiParam({ name: 'id', description: 'ID of the professional degree to recover' })
  @ApiResponse({
    status: 200,
    description: 'The recovered professional degree',
    type: SerializerProfessionalDegreeDto,
  })
  @ApiResponse({ status: 404, description: 'Professional degree not found' })
  @ApiResponse({ status: 400, description: 'Professional degree is not soft-deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async recover(@Param('id') id: string): Promise<SerializerProfessionalDegreeDto> {
    const entity = await this.service.recover(id);
    return toDto(SerializerProfessionalDegreeDto, entity);
  }
}