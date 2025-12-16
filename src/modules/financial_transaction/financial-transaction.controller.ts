import { Controller, Get, Post, Put, Delete, Patch, Param, Body, ParseUUIDPipe, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { FinancialTransactionService } from './financial-transaction.service';
import { FinancialTransaction } from '../../domain/entities/financial-transaction.entity';
import { CreateFinancialTransactionDto, UpdateFinancialTransactionDto, SerializerFinancialTransactionDto } from '../../domain/dtos';
import { toDto } from '../../common/util/transform-dto.util';
import { AuthGuard, RolesGuard, Roles } from '../auth/guards/auth.guard';
import { Role } from '../../domain/enums';
import { PaginationDto } from '../../common/dtos';
import { PaginationMetadata } from '../../common/util/pagination-data.util';

@ApiTags('FinancialTransaction')
@Controller('financial-transaction')
export class FinancialTransactionController {
  constructor(private readonly financialTransactionService: FinancialTransactionService) {}

  @Roles(Role.ADMIN, Role.PRACTITIONER, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get()
  @ApiOperation({ summary: 'Obtener todas las transacciones financieras' })
  @ApiResponse({ status: 200, description: 'Transacciones obtenidas', type: SerializerFinancialTransactionDto, isArray: true })
  @ApiResponse({ status: 400, description: 'Bad Rquest' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async findAll(): Promise<SerializerFinancialTransactionDto[]> {
    const transactions = await this.financialTransactionService.findAll();
    return transactions.map(t => toDto(SerializerFinancialTransactionDto, t));
  }

  @Roles(Role.ADMIN, Role.PRACTITIONER, Role.PATIENT)
  @Get('paginated')
  @ApiOperation({ summary: 'Obtener todas las transacciones financieras paginadas' })
  @ApiResponse({ status: 200, description: 'Transacciones obtenidas', type: SerializerFinancialTransactionDto, isArray: true })
  @ApiResponse({ status: 400, description: 'Invalid pagination parameters' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async findAllPaginated(
    @Query() paginationDto: PaginationDto
  ): Promise<{ data: SerializerFinancialTransactionDto[]; meta: PaginationMetadata }> {
    return await this.financialTransactionService.findAllPaginated(paginationDto);
  }

  @Roles(Role.ADMIN, Role.PRACTITIONER, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get(':id')
  @ApiOperation({ summary: 'Obtener una transacción financiera por id' })
  @ApiParam({ name: 'id', description: 'UUID de la transacción financiera', type: String })
  @ApiResponse({ status: 200, description: 'Transacción encontrada', type: SerializerFinancialTransactionDto })
  @ApiResponse({ status: 404, description: 'finantial transactions not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<SerializerFinancialTransactionDto> {
    const transaction = await this.financialTransactionService.findOne(id);
    return toDto(SerializerFinancialTransactionDto, transaction);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Post()
  @ApiOperation({ summary: 'Crear una nueva transacción financiera' })
  @ApiResponse({ status: 201, description: 'Transacción creada', type: SerializerFinancialTransactionDto })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async create(@Body() createDto: CreateFinancialTransactionDto): Promise<SerializerFinancialTransactionDto> {
    const transaction = await this.financialTransactionService.create(createDto);
    return toDto(SerializerFinancialTransactionDto, transaction);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una transacción financiera existente' })
  @ApiParam({ name: 'id', description: 'UUID de la transacción financiera', type: String })
  @ApiResponse({ status: 200, description: 'Transacción actualizada', type: SerializerFinancialTransactionDto })
  @ApiResponse({ status: 404, description: 'finantial transactions not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateDto: UpdateFinancialTransactionDto
  ): Promise<SerializerFinancialTransactionDto> {
    const updatedTransaction = await this.financialTransactionService.update(id, updateDto);
    return toDto(SerializerFinancialTransactionDto, updatedTransaction);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una transacción financiera de forma permanente' })
  @ApiParam({ name: 'id', description: 'UUID de la transacción financiera', type: String })
  @ApiResponse({ status: 200, description: 'Transacción eliminada' })
  @ApiResponse({ status: 404, description: 'finantial transactions not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<{ message: string }> {
    const message = await this.financialTransactionService.remove(id);
    return { message };
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Patch('soft-remove/:id')
  @ApiOperation({ summary: 'Realizar soft delete en una transacción financiera' })
  @ApiParam({ name: 'id', description: 'UUID de la transacción financiera', type: String })
  @ApiResponse({ status: 200, description: 'Transacción soft deleted' })
  @ApiResponse({ status: 404, description: 'finantial transactions not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async softRemove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<{ message: string }> {
    const message = await this.financialTransactionService.softRemove(id);
    return { message };
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Patch('restore/:id')
  @ApiOperation({ summary: 'Restaurar una transacción financiera soft deleted' })
  @ApiParam({ name: 'id', description: 'UUID de la transacción financiera', type: String })
  @ApiResponse({ status: 200, description: 'Transacción restaurada', type: SerializerFinancialTransactionDto })
  @ApiResponse({ status: 404, description: 'finantial transactions not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async restore(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<SerializerFinancialTransactionDto> {
    const transaction = await this.financialTransactionService.restore(id);
    return toDto(SerializerFinancialTransactionDto, transaction);
  }
}
