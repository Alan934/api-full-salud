import { Body, Controller, Get, Post, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ChargeItemService } from './charge-item.service';
import { ChargeItem } from '../../domain/entities';
import { ControllerFactory } from '../../common/factories/controller.factory';
import {
  CreateChargeItemDto,
  SerializerChargeItemDto,
  UpdateChargeItemDto
} from '../../domain/dtos';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard, Roles, RolesGuard } from '../auth/guards/auth.guard';
import { Role } from '../../domain/enums';
import { toDto, toDtoList } from '../../common/util/transform-dto.util';
import { ApiPaginationResponse } from '../../common/swagger/api-pagination-response';
import { ChargeItemPaginatedDTO } from '../../domain/dtos/charge-item/charge-item-filtered-pagination.dto';

@ApiTags('ChargeItem')
@Controller('charge-item')
export class ChargeItemController  {
  constructor(protected service: ChargeItemService) {}

  @Post()
  @Roles(Role.PRACTITIONER)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Create a new practitioner appointment slot' })
  @ApiResponse({
    status: 201,
    description: 'The created charge item ',
    type: SerializerChargeItemDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Charge item not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async create(@Body() createDto: CreateChargeItemDto): Promise<SerializerChargeItemDto> {
    const entity = await this.service.create(createDto);
    return toDto(SerializerChargeItemDto, entity);
  }

  @Get()
  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.SECRETARY, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Get all Charge items with optional filtering and pagination',
    description: 'Retrieve a list of Charge items, filtered by criteria like price, practitioner, or procedure, and supports pagination.',
  })
  @ApiPaginationResponse(SerializerChargeItemDto)
  @ApiResponse({ status: 200, description: 'Paginated list of charge items retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid pagination parameters' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiQuery({ name: 'price', required: false, type: Number, description: 'Filter by price' })
  @ApiQuery({ name: 'practitionerId', required: false, type: String, description: 'Filter by Practitioner ID' })
  @ApiQuery({ name: 'procedureId', required: false, type: String, description: 'Filter by Procedure ID' })
  async findAllPaginated(
    @Query() filterPaginationDto: ChargeItemPaginatedDTO,
  ): Promise<{ data: SerializerChargeItemDto[]; lastPage: number; total: number; msg?: string }> {
    const { data, lastPage, total, msg } = await this.service.findAllPaginated(filterPaginationDto);
    const serializedData = toDtoList(SerializerChargeItemDto, data);
    return { data: serializedData, total, lastPage, msg };
  }

  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.SECRETARY, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific charge item by ID' })
  @ApiParam({ name: 'id', description: 'Charge item appointment ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'The requested Charge item',
    type: SerializerChargeItemDto
  })
  @ApiResponse({ status: 404, description: 'Charge Item not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async getOne(@Param('id') id: string): Promise<SerializerChargeItemDto> {
    const entity = await this.service.getOne(id);
    return toDto(SerializerChargeItemDto, entity);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.PRACTITIONER)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Update an existing charge item' })
  @ApiParam({ name: 'id', description: 'ID of the charge item to update' })
  @ApiResponse({
    status: 200,
    description: 'The updated charge item',
    type: SerializerChargeItemDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Charge Item, Practitioner, or Procedure not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateChargeItemDto,
  ): Promise<SerializerChargeItemDto> {
    const entity = await this.service.update(id, updateDto);
    return toDto(SerializerChargeItemDto, entity);
  }

  @Patch('soft-delete/:id')
  @Roles(Role.ADMIN, Role.PRACTITIONER)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Soft delete a charge item' })
  @ApiParam({ name: 'id', description: 'ID of the charge item to soft delete' })
  @ApiResponse({
    status: 200,
    description: 'Message confirming soft deletion',
    schema: { example: { message: 'Charge item with ID "..." soft deleted successfully' } },
  })
  @ApiResponse({ status: 404, description: 'Charge item not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async softDelete(@Param('id') id: string): Promise<{ message: string }> {
    return this.service.softDeleted(id);
  }

  @Patch('recover/:id')
  @Roles(Role.ADMIN, Role.PRACTITIONER)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Recover a charge item' })
  @ApiParam({ name: 'id', description: 'ID of the charge item to recover' })
  @ApiResponse({
    status: 200,
    description: 'Message confirming recovery',
    schema: { example: { message: 'Charge item with ID "..." recovered successfully' } },
  })
  @ApiResponse({ status: 404, description: 'Charge item not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async recover(@Param('id') id: string): Promise<SerializerChargeItemDto> {
    const entity = await this.service.recover(id);
    return toDto(SerializerChargeItemDto, entity)
  }

}
