import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { LocationService } from './location.service';
import { ControllerFactory } from '../../common/factories/controller.factory';
import { Location } from '../../domain/entities';
import { CreateLocationDto, SerializerLocationDto, UpdatelocationDto } from '../../domain/dtos';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { toDto } from '../../common/util/transform-dto.util';
import { AuthGuard, Roles, RolesGuard } from '../auth/guards/auth.guard';
import { Role } from '../../domain/enums';

@ApiTags('Location')
@Controller('location')
export class LocationController{
  constructor(protected readonly locationsService: LocationService){} 
  

  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Crear una ubicación', description: 'Crear una ubicación' })
  @Post()
  @ApiResponse({ status: 201, description: 'Ubicación creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async createlocation(@Body() createlocationDto: CreateLocationDto) {
    return await this.locationsService.createlocation(createlocationDto);
  }

  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Obtener todas las ubicaciones', description: 'Obtener todas las ubicaciones' })
  @Get()
  @ApiResponse({ status: 200, description: 'Ubicaciones obtenidas exitosamente' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async getAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ): Promise<{ total: number; page: number; limit: number; locations: SerializerLocationDto[] }> {
    const { locations, total } = await this.locationsService.getAll(page, limit);
    return { locations: locations.map((location) => toDto(SerializerLocationDto, location)), total, page, limit };
  }

  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Obtener una ubicación por ID', description: 'Obtener una ubicación por ID' })
  @Get(':id')
  @ApiResponse({ status: 200, description: 'Ubicación obtenida exitosamente' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async getOnelocation(@Param('id') id: string) {
    return await this.locationsService.getOne(id);
  }

  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Actualizar una ubicación', description: 'Actualizar una ubicación' })
  @Patch(':id')
  @ApiResponse({ status: 200, description: 'Ubicación actualizada exitosamente' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async updatelocation(@Param('id') id: string, @Body() updatelocationDto: UpdatelocationDto) {
    return await this.locationsService.update(id, updatelocationDto);
  }

  @Roles(Role.PRACTITIONER, Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Eliminar una ubicación', description: 'Eliminar una ubicación' })
  @Delete(':id')
  @ApiResponse({ status: 200, description: 'Ubicación eliminada exitosamente' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async softDelete(@Param('id') id: string) {
    return await this.locationsService.softDelete(id);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Recuperar una ubicación', description: 'Recuperar una ubicación' })
  @Post('/recover/:id')
  @ApiResponse({ status: 200, description: 'Ubicación recuperada exitosamente' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async recover(@Param('id') id: string) {
    return await this.locationsService.recover(id);
  }
}
