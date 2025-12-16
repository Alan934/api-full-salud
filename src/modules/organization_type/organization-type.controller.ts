import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { OrganizationTypeService } from './organization-type.service';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard, Roles, RolesGuard } from '../auth/guards/auth.guard';
import { Role } from '../../domain/enums';
import { SerializerorganizationTypeDto } from '../../domain/dtos/organization-type/organization-type-serializer.dto';
import { CreateOrganizationTypeDto, UpdateOrganizationTypeDto } from '../../domain/dtos';
import { toDto, toDtoList } from '../../common/util/transform-dto.util';
import { OrganizationTypeFilteredPaginationDto } from '../../domain/dtos/organization-type/organization-type-filtered-pagination.dto';
import { ApiPaginationResponse } from '../../common/swagger/api-pagination-response';

@ApiTags('Organization Type')
@Controller('organization-type')
export class OrganizationTypeController {
  constructor(protected service: OrganizationTypeService) { }

  @Post()
  @Roles(Role.ADMIN, Role.PRACTITIONER)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Create a new Organization Type', description: 'Create a new Organization Type' })
  @ApiResponse({
    status: 201,
    description: 'The created Organization type',
    type: SerializerorganizationTypeDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async create(@Body() createDto: CreateOrganizationTypeDto): Promise<SerializerorganizationTypeDto> {
    const entity = await this.service.create(createDto);
    return toDto(SerializerorganizationTypeDto, entity);
  }


  @Get()
  @Roles(Role.ADMIN, Role.PRACTITIONER, Role.SECRETARY)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Get all organization types with pagination and optional filtering', description: 'Get all organization types with pagination and optional filtering' })
  @ApiPaginationResponse(SerializerorganizationTypeDto)
  @ApiResponse({ status: 200, description: 'Paginated list of practitionerRoles retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid pagination parameters' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiQuery({ name: 'type', required: false, type: String, description: 'Filter by type name' })
  async findAllPaginated(
    @Query() filterDto: OrganizationTypeFilteredPaginationDto,
  ): Promise<{ data: SerializerorganizationTypeDto[]; lastPage: number; total: number; msg?: string }> {
    const { data, lastPage, total, msg } = await this.service.findAllPaginated(filterDto);
    const serializedData = toDtoList(SerializerorganizationTypeDto, data);
    return { data: serializedData, total, lastPage, msg };
  }

  @Get(':id')
  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.SECRETARY, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Get a specific OrganizationType by ID', description: 'Get a specific OrganizationType by ID' })
  @ApiParam({ name: 'id', description: 'OrganizationType ID' })
  @ApiResponse({
    status: 200,
    description: 'The requested OrganizationType',
    type: SerializerorganizationTypeDto
  })
  @ApiResponse({ status: 404, description: 'OrganizationType not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async getOne(@Param('id') id: string): Promise<SerializerorganizationTypeDto> {
    const entity = await this.service.getOne(id);
    return toDto(SerializerorganizationTypeDto, entity);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.PRACTITIONER)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Update an existing OrganizationType by ID', description: 'Update an existing OrganizationType by ID' })
  @ApiParam({ name: 'id', description: 'OrganizationType ID to update' })
  @ApiResponse({
    status: 200,
    description: 'The updated OrganizationType',
    type: SerializerorganizationTypeDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'OrganizationType not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateOrganizationTypeDto,
  ): Promise<SerializerorganizationTypeDto> {
    const entity = await this.service.update(id, updateDto);
    return toDto(SerializerorganizationTypeDto, entity);
  }

  @Delete('soft-delete/:id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Soft delete a OrganizationType', description: 'Soft delete a OrganizationType' })
  @ApiParam({ name: 'id', description: 'OrganizationType ID to soft delete' })
  @ApiResponse({
    status: 200,
    description: 'Message confirming soft deletion',
    schema: { example: { message: 'OrganizationType with ID "..." soft deleted successfully' } },
  })
  @ApiResponse({ status: 404, description: 'OrganizationType not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async softDelete(@Param('id') id: string): Promise<{ message: string }> {
    return this.service.softDeleted(id);
  }

  @Patch('recover/:id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Recover a soft-deleted OrganizationType', description: 'Recover a soft-deleted OrganizationType' })
  @ApiParam({ name: 'id', description: 'OrganizationType ID to recover' })
  @ApiResponse({
    status: 200,
    description: 'The recovered OrganizationType',
    type: SerializerorganizationTypeDto,
  })
  @ApiResponse({ status: 404, description: 'OrganizationType not found' })
  @ApiResponse({ status: 400, description: 'OrganizationType is not soft-deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async recover(@Param('id') id: string): Promise<SerializerorganizationTypeDto> {
    const entity = await this.service.recover(id);
    return toDto(SerializerorganizationTypeDto, entity);
  }


}
