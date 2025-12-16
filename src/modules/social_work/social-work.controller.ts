import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { SocialWorkService } from './social-work.service';
import { ControllerFactory } from '../../common/factories/controller.factory';
import { SocialWork } from '../../domain/entities';
import { CreateSocialWorkDto, SerializerSocialWorkDto, UpdateSocialWorkDto } from '../../domain/dtos';
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { toDto } from '../../common/util/transform-dto.util';
import { AuthGuard, Roles, RolesGuard } from '../auth/guards/auth.guard';

import { Role } from '../../domain/enums'; 
import { ApiPaginationResponse } from '../../common/swagger/api-pagination-response';

@ApiTags('Social Work')
@Controller('social-work')
export class SocialWorkController {
  constructor(protected readonly socialWorkService: SocialWorkService) { }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Post()
  @ApiOperation({ summary: 'Crear una Obra Social' })
  @ApiResponse({
    status: 201,
    description: 'Obra Social creada exitosamente',
    type: SerializerSocialWorkDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async createSocialWork(@Body() createSocialWorkDto: CreateSocialWorkDto) {
    return await this.socialWorkService.createSocialWork(createSocialWorkDto);
  }

  @Roles(Role.PRACTITIONER,Role.ADMIN,Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Get all social works with pagination' })
  @ApiPaginationResponse(SerializerSocialWorkDto)
  @Get()
  @ApiOperation({ description: 'Obtener todas las obras sociales', summary: 'Obtener todas las obras sociales' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async getAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ): Promise<{ total: number; page: number; limit: number; socialWorks: SerializerSocialWorkDto[] }> {
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const { socialWorks, total } = await this.socialWorkService.getAll(pageNumber, limitNumber);
    return {
      socialWorks: socialWorks.map((socialWork) => toDto(SerializerSocialWorkDto, socialWork)),
      total,
      page: pageNumber,
      limit: limitNumber,
    };
  }

  @Roles(Role.ADMIN, Role.PRACTITIONER, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Get a specific Social Work by ID' })
  @ApiParam({ name: 'id', description: 'Social Work ID' })
  @ApiResponse({
    status: 200,
    description: 'The social work',
    type: SerializerSocialWorkDto
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  @Get(':id')
  @ApiOperation({ description: 'Obtener una obra social por ID', summary: 'Obtener una obra social por ID' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async getOneSocialWork(@Param('id') id: string) {
    return await this.socialWorkService.getOne(id);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Update an existing Social work by ID' })
  @ApiResponse({
    status: 200,
    description: 'The updated Social work',
    type: SerializerSocialWorkDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  @Patch(':id')
  @ApiOperation({ description: 'Actualizar una obra social por ID', summary: 'Actualizar una obra social por ID' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async updateSocialWork(
    @Param('id') id: string,
    @Body() updateSocialWorkDto: UpdateSocialWorkDto,
  ) {
    return await this.socialWorkService.update(id, updateSocialWorkDto);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Soft delete an existing Social work by ID' })
  @ApiResponse({
    status: 200,
    description: 'Social Work soft deleted successfully'
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  @Delete('/soft-delete/:id')
  async softDelete(@Param('id') id: string) {
    return await this.socialWorkService.softDelete(id);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Recover a deleted Social work by ID' })
  @ApiResponse({
    status: 200,
    description: 'The social work recovered',
    type: SerializerSocialWorkDto
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  @Post('/recover/:id')
  @ApiOperation({ description: 'Recuperar una obra social por ID', summary: 'Recuperar una obra social por ID' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async recover(@Param('id') id: string) {
    return await this.socialWorkService.recover(id);
  }
}
