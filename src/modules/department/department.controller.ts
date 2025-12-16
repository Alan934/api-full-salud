import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';
import { ControllerFactory } from '../../common/factories/controller.factory';
import {
  CreateDepartmentDto,
  FilteredDepartmentDto,
  SerializerDepartmentDto,
  SerializerShortDepartmentDto,
  UpdateDepartmentDto
} from '../../domain/dtos';
import { Department } from '../../domain/entities';
import { DepartmentService } from './department.service';
import { PaginationDto } from '../../common/dtos/pagination-common.dto';
import { toDto, toDtoList } from '../../common/util/transform-dto.util';
import { ApiPaginationResponse } from '../../common/swagger/api-pagination-response';
import { AuthGuard, Roles, RolesGuard } from '../auth/guards/auth.guard';
import { Role } from '../../domain/enums';
import { PaginationMetadata } from '../../common/util/pagination-data.util';

@ApiTags('Department')
@ApiExtraModels(SerializerShortDepartmentDto) // Registrar el DTO en Swagger
@Controller('department')
export class DepartmentController {
  constructor(protected service: DepartmentService) {  }

  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('by-province/:provinceId')
  @ApiParam({
    name: 'provinceId',
    type: 'string',
    description: 'ID de la provincia'
  })
  @ApiOperation({
    description: 'Obtener departamentos por ID de provincia con paginación',
    summary: 'Obtener departamentos por ID de provincia con paginación'
  })
  @ApiPaginationResponse(SerializerShortDepartmentDto) // Aplicar el decorador ApiPaginationResponse
  @ApiResponse({ status: 201, description: 'Department created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' }) 
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async findByProvince(
    @Param('provinceId') provinceId: string,
    @Query() paginationDto: PaginationDto
  ) {
    const { data, meta } = await this.service.findByProvince(
      provinceId,
      paginationDto
    );
    return { data: toDtoList(SerializerShortDepartmentDto, data), meta };
  }

  @Post()
  @Roles(Role.ADMIN, Role.PRACTITIONER)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Create a new department', description: 'Create a new department'})
  @ApiResponse({
    status: 201,
    description: 'Department created',
    type: SerializerDepartmentDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async create(@Body() createDto: CreateDepartmentDto): Promise<SerializerDepartmentDto> {
    const entity = await this.service.create(createDto);
    return toDto(SerializerDepartmentDto, entity);
  }

  @Get()
  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.SECRETARY)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Get all departments with optional filtering and pagination',
    description: 'Retrieve a list of departments, filtered by criteria like price, practitioner, or procedure, and supports pagination.',
  })
  @ApiPaginationResponse(SerializerDepartmentDto)
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiQuery({ name: 'name', required: false, type: String, description: 'Filter by name' })
  @ApiResponse({ status: 400, description: 'Invalid pagination parameters' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async findAllPaginated(
    @Query() filterPaginationDto: FilteredDepartmentDto,
  ): Promise<{ data: SerializerDepartmentDto[];meta: PaginationMetadata }> {
    const { data, meta } = await this.service.getAll(filterPaginationDto);
    const serializedData = toDtoList(SerializerDepartmentDto, data);
    return { data: serializedData,  meta};
  }

  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.SECRETARY, Role.PATIENT, Role.PRACTITIONER_SECRETARY, Role.ORGANIZATION)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific Department by ID', description: 'Get a specific Department by ID' })
  @ApiParam({ name: 'id', description: 'Department ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'The requested Department',
    type: SerializerDepartmentDto
  })
  @ApiResponse({ status: 404, description: 'Department not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async getOne(@Param('id') id: string): Promise<SerializerDepartmentDto> {
    const entity = await this.service.getOne(id);
    return toDto(SerializerDepartmentDto, entity);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.PRACTITIONER)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Update an existing Department', description: 'Update an existing Department' })
  @ApiParam({ name: 'id', description: 'ID of the charge item to update' })
  @ApiResponse({
    status: 200,
    description: 'The updated Department',
    type: SerializerDepartmentDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDepartmentDto,
  ): Promise<SerializerDepartmentDto> {
    const entity = await this.service.update(id, updateDto);
    return toDto(SerializerDepartmentDto, entity);
  }

  @Patch('soft-delete/:id')
  @Roles(Role.ADMIN, Role.PRACTITIONER)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Soft delete a department', description: 'Soft delete a department' })
  @ApiParam({ name: 'id', description: 'ID of the department to soft delete' })
  @ApiResponse({
    status: 200,
    description: 'Message confirming soft deletion',
    schema: { example: { message: `Department with ID ... soft deleted successfully` } },
  })
  @ApiResponse({ status: 404, description: 'Department not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async softDelete(@Param('id') id: string): Promise<{ message: string }> {
    return this.service.softDeleted(id);
  }  

  @Patch('recover/:id')
  @Roles(Role.ADMIN, Role.PRACTITIONER)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Recover a department', description: 'Recover a department' })
  @ApiParam({ name: 'id', description: 'ID of the department to recover' })
  @ApiResponse({
    status: 200,
    description: 'Message confirming recovery',
    schema: { example: { message: 'Department with ID "..." recovered successfully' } },
  })
  @ApiResponse({ status: 404, description: 'Department not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async recover(@Param('id') id: string): Promise<SerializerDepartmentDto> {
    const entity = await this.service.restore(id);
    return toDto(SerializerDepartmentDto, entity)
  }

}
