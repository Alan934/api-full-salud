import { Controller, Get, Post, Put, Delete, Patch, Param, Body, Query, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AddressService } from './address.service';
import { CreateAddressDto, UpdateAddressDto, SerializerAddressDto } from '../../domain/dtos';
import { toDto, toDtoList } from '../../common/util/transform-dto.util';
import { PaginationMetadata } from '../../common/util/pagination-data.util';
import { FilteredAddressDto } from '../../domain/dtos/address/FilteredAddress.dto';
import { PaginationDto } from '../../common/dtos';
import { AuthGuard, Roles, RolesGuard } from '../auth/guards/auth.guard';
import { Role } from '../../domain/enums';

@ApiTags('Addresses')
@Controller('addresses')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Roles(Role.ADMIN, Role.PRACTITIONER, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get()
  @ApiOperation({ summary: 'Obtener todas las direcciones paginadas' })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1, description: 'Número de página' })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 10, description: 'Límite de resultados por página' })
  @ApiResponse({ status: 200, description: 'Direcciones obtenidas exitosamente', type: SerializerAddressDto, isArray: true })
  @ApiResponse({ status: 400, description: 'Invalid pagination parameters' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async findAll(
    @Query() paginationDto: PaginationDto
  ): Promise<{ data: SerializerAddressDto[]; meta: PaginationMetadata }> {
    const { data, meta } = await this.addressService.findAll(paginationDto);
    return { data: toDtoList(SerializerAddressDto, data), meta };
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('include-deletes')
  @ApiOperation({ summary: 'Obtener todas las direcciones incluyendo eliminadas' })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1, description: 'Número de página' })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 10, description: 'Límite de resultados por página' })
  @ApiResponse({ status: 200, description: 'Direcciones obtenidas', type: SerializerAddressDto, isArray: true })
  @ApiResponse({ status: 400, description: 'Invalid pagination parameters' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async findAllIncludeDeletes(
    @Query() paginationDto: PaginationDto
  ): Promise<{ data: SerializerAddressDto[]; meta: PaginationMetadata }> {
    const { data, meta } = await this.addressService.findAllIncludeDeletes(paginationDto);
    return { data: toDtoList(SerializerAddressDto, data), meta };
  }

  @Roles(Role.ADMIN, Role.PRACTITIONER, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('filtered')
  @ApiOperation({ summary: 'Obtener direcciones filtradas y paginadas' })
  @ApiQuery({ name: 'street', type: String, required: false, description: 'Nombre de la calle' })
  @ApiQuery({ name: 'floor', type: String, required: false, description: 'Piso' })
  @ApiQuery({ name: 'zipCode', type: String, required: false, description: 'Código postal' })
  @ApiQuery({ name: 'localityId', type: String, required: false, description: 'ID de la localidad' })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1, description: 'Número de página' })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 10, description: 'Límite de resultados por página' })
  @ApiResponse({ status: 200, description: 'Direcciones filtradas obtenidas', type: SerializerAddressDto, isArray: true })
  @ApiResponse({ status: 400, description: 'Invalid pagination parameters' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async findAllFiltered(
    @Query() query: any
  ): Promise<{ data: SerializerAddressDto[]; meta: PaginationMetadata; msg: string }> {
    const { page = 1, limit = 10, street, floor, zipCode, localityId } = query;
    const paginationDto: PaginationDto = { page: Number(page), limit: Number(limit) };
    const filteredDto: FilteredAddressDto = { street, floor, zipCode, localityId, page: Number(page), limit: Number(limit) };
    const { data, meta, msg } = await this.addressService.findAllFiltered(filteredDto, paginationDto);
    return { data: toDtoList(SerializerAddressDto, data), meta, msg };
  }

  @Roles(Role.ADMIN, Role.PRACTITIONER, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get(':id')
  @ApiOperation({ summary: 'Obtener una dirección por id' })
  @ApiParam({ name: 'id', description: 'UUID de la dirección', type: String })
  @ApiResponse({ status: 200, description: 'Dirección encontrada', type: SerializerAddressDto })
  @ApiResponse({ status: 404, description: 'Not Found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ): Promise<SerializerAddressDto> {
    const address = await this.addressService.findOne(id);
    return toDto(SerializerAddressDto, address);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Post()
  @ApiOperation({ summary: 'Crear una nueva dirección' })
  @ApiResponse({ status: 201, description: 'Dirección creada', type: SerializerAddressDto })
  @ApiResponse({ status: 40, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async create(@Body() createAddressDto: CreateAddressDto): Promise<SerializerAddressDto> {
    const address = await this.addressService.create(createAddressDto);
    return toDto(SerializerAddressDto, address);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una dirección existente' })
  @ApiParam({ name: 'id', description: 'UUID de la dirección', type: String })
  @ApiResponse({ status: 200, description: 'Dirección actualizada', type: SerializerAddressDto })
  @ApiResponse({ status: 404, description: 'Not Found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ): Promise<SerializerAddressDto> {
    const updated = await this.addressService.update(id, updateAddressDto);
    return toDto(SerializerAddressDto, updated);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una dirección de forma permanente' })
  @ApiParam({ name: 'id', description: 'UUID de la dirección', type: String })
  @ApiResponse({ status: 200, description: 'Dirección eliminada' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ): Promise<{ message: string }> {
    const message = await this.addressService.remove(id);
    return { message };
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Patch('soft-remove/:id')
  @ApiOperation({ summary: 'Soft delete de una dirección' })
  @ApiParam({ name: 'id', description: 'UUID de la dirección', type: String })
  @ApiResponse({ status: 200, description: 'Dirección soft deleted' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async softRemove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ): Promise<{ message: string }> {
    const message = await this.addressService.softRemove(id);
    return { message };
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Patch('restore/:id')
  @ApiOperation({ summary: 'Restaurar una dirección soft deleted' })
  @ApiParam({ name: 'id', description: 'UUID de la dirección', type: String })
  @ApiResponse({ status: 200, description: 'Dirección restaurada', type: SerializerAddressDto })
  @ApiResponse({ status: 404, description: 'Not Found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async restore(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ): Promise<SerializerAddressDto> {
    const address = await this.addressService.restore(id);
    return toDto(SerializerAddressDto, address);
  }
}