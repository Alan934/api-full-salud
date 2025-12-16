import { Controller, Post, Body, Get, Query, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PractitionerSocialWorkService } from './practitioner_social_work.service';
import { 
  CreatePractitionerSocialWorkDto, 
  UpdatePractitionerSocialWorkDto, 
  PractitionerSocialWorkSerializerDto, 
  PractitionerSocialWorkFilteredPaginationDto 
} from '../../domain/dtos';
import { toDto, toDtoList } from '../../common/util/transform-dto.util';
import { Role } from '../../domain/enums';
import { AuthGuard, Roles, RolesGuard } from '../auth/guards/auth.guard';
import { ApiPaginationResponse } from '../../common/swagger/api-pagination-response';

@ApiTags('Practitioner Social Work')
@ApiBearerAuth('bearerAuth')
@Controller('practitioner-social-work')
export class PractitionerSocialWorkController {
  constructor(private readonly service: PractitionerSocialWorkService) {}

  @Post()
  @Roles(Role.ADMIN, Role.PRACTITIONER)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Create a new PractitionerSocialWork entry (link Practitioner to SocialWork with a price)' })
  @ApiResponse({ status: 201, description: 'Entry created successfully', type: PractitionerSocialWorkSerializerDto })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Practitioner or SocialWork not found' })
  @ApiResponse({ status: 409, description: 'Entry for this Practitioner and SocialWork already exists' })
  async create(@Body() createDto: CreatePractitionerSocialWorkDto): Promise<PractitionerSocialWorkSerializerDto> {
    const entity = await this.service.create(createDto);
    return toDto(PractitionerSocialWorkSerializerDto, entity);
  }

  @Get()
  @Roles(Role.ADMIN, Role.PRACTITIONER, Role.PATIENT, Role.SECRETARY)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get all Practitioner Social Work entries with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of Practitioner Social Work retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid pagination parameters' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  @ApiPaginationResponse(PractitionerSocialWorkSerializerDto)
  async findAllPaginated(@Query() filterDto: PractitionerSocialWorkFilteredPaginationDto): Promise<{ data: PractitionerSocialWorkSerializerDto[], total: number, page: number, limit: number, lastPage: number }> {
    const result = await this.service.findAllPaginated(filterDto);
    return {
      ...result,
      data: toDtoList(PractitionerSocialWorkSerializerDto, result.data),
    };
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.PRACTITIONER, Role.PATIENT, Role.SECRETARY)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get a specific PractitionerSocialWork entry by ID' })
  @ApiParam({ name: 'id', description: 'ID of the PractitionerSocialWork entry' })
  @ApiResponse({ status: 200, description: 'The requested entry', type: PractitionerSocialWorkSerializerDto })
  @ApiResponse({ status: 404, description: 'Entry not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async getOne(@Param('id') id: string): Promise<PractitionerSocialWorkSerializerDto> {
    const entity = await this.service.getOne(id);
    return toDto(PractitionerSocialWorkSerializerDto, entity);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.PRACTITIONER)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Update the price of a PractitionerSocialWork entry' })
  @ApiParam({ name: 'id', description: 'ID of the entry to update' })
  @ApiResponse({ status: 200, description: 'Entry updated successfully', type: PractitionerSocialWorkSerializerDto })
  @ApiResponse({ status: 404, description: 'Entry not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async update(@Param('id') id: string, @Body() updateDto: UpdatePractitionerSocialWorkDto): Promise<PractitionerSocialWorkSerializerDto> {
    const entity = await this.service.update(id, updateDto);
    return toDto(PractitionerSocialWorkSerializerDto, entity);
  }

  @Patch('soft-delete/:id')
  @Roles(Role.ADMIN, Role.PRACTITIONER)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Soft delete a PractitionerSocialWork entry' })
  @ApiParam({ name: 'id', description: 'ID of the entry to soft delete' })
  @ApiResponse({ status: 200, description: 'Entry soft deleted' })
  @ApiResponse({ status: 404, description: 'Entry not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async softDelete(@Param('id') id: string): Promise<{ message: string }> {
    return this.service.softDelete(id);
  }

  @Patch('recover/:id')
  @Roles(Role.ADMIN, Role.PRACTITIONER)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Recover a soft-deleted PractitionerSocialWork entry' })
  @ApiParam({ name: 'id', description: 'ID of the entry to recover' })
  @ApiResponse({ status: 200, description: 'Entry recovered successfully', type: PractitionerSocialWorkSerializerDto })
  @ApiResponse({ status: 404, description: 'Entry not found' })
  @ApiResponse({ status: 400, description: 'Entry is not deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async recover(@Param('id') id: string): Promise<PractitionerSocialWorkSerializerDto> {
    const entity = await this.service.recover(id);
    return toDto(PractitionerSocialWorkSerializerDto, entity);
  }
}
