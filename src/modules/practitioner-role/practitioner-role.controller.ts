import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PractitionerRoleService } from './practitioner-role.service';
import { PractitionerRole } from '../../domain/entities';
import { ControllerFactory } from '../../common/factories/controller.factory';
import {
  CreatePractitionerRoleDto,
  SerializerPractitionerRoleDto,
  UpdatePractitionerRoleDto
} from '../../domain/dtos';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '../../domain/enums/role.enum';
import { AuthGuard, Roles, RolesGuard } from '../auth/guards/auth.guard';
import { PaginationDto } from '../../common/dtos/pagination-common.dto';
import { PaginationMetadata } from '../../common/util/pagination-data.util';
@ApiTags('Practitioner Role')
@Controller('practitioner-role')
export class PractitionerRoleController {
  constructor(protected service: PractitionerRoleService, private readonly practitionerRoleService: PractitionerRoleService) {
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Post()
  @ApiOperation({ summary: 'Create a new practitionerRole' })
  @ApiResponse({ status: 201, description: 'practitionerRole created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' }) 
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async create(@Body() createpractitionerRoleDto: CreatePractitionerRoleDto): Promise<PractitionerRole> {
    return await this.practitionerRoleService.createpractitionerRole(createpractitionerRoleDto);
  }

  @ApiBearerAuth('bearerAuth')
  @Get(':id')
  @ApiOperation({ summary: 'Get a practitionerRole by ID' })
  @ApiResponse({ status: 200, description: 'practitionerRole found' })
  @ApiResponse({ status: 404, description: 'practitionerRole not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async getOne(@Param('id') id: string): Promise<PractitionerRole> {
    return await this.practitionerRoleService.getOne(id);
  }

  @ApiBearerAuth('bearerAuth')
  @Get('paginated')
  @ApiOperation({ summary: 'Get all practitionerRole with pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of practitionerRoles retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid pagination parameters' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async findAllPaginated(
    @Query() paginationDto: PaginationDto
  ): Promise<{ data: SerializerPractitionerRoleDto[]; meta: PaginationMetadata }> {
    return await this.practitionerRoleService.findAllPaginated(paginationDto);
  }
  

  @Get()
  @ApiOperation({ summary: 'Get all practitionerRole' })
  @ApiResponse({ status: 200, description: 'List of practitionerRole' })
  @ApiResponse({ status: 404, description: 'practitionerRole not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async getAll(): Promise<PractitionerRole[]> {
    return await this.practitionerRoleService.getAll();
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a practitionerRole by ID' })
  @ApiResponse({ status: 200, description: 'practitionerRole updated successfully' })
  @ApiResponse({ status: 404, description: 'practitionerRole not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async update(
    @Param('id') id: string, 
    @Body() updatepractitionerRoleDto: UpdatePractitionerRoleDto
  ): Promise<PractitionerRole> {
    return await this.practitionerRoleService.updatepractitionerRole(id, updatepractitionerRoleDto);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft delete a practitionerRole by ID' })
  @ApiResponse({ status: 204, description: 'practitionerRole deleted successfully' })
  @ApiResponse({ status: 404, description: 'practitionerRole not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async removepractitionerRole(@Param('id') id: string): Promise<void> {
    await this.practitionerRoleService.softDelete(id);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Patch('/recover/:id')
  @ApiOperation({ summary: 'Recover a soft-deleted practitionerRole by ID' })
  @ApiResponse({ status: 200, description: 'practitionerRole recovered successfully' })
  @ApiResponse({ status: 404, description: 'practitionerRole not found or not deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async recover(@Param('id') id: string): Promise<PractitionerRole> {
    return await this.practitionerRoleService.recoverpractitionerRole(id);
  }

}

