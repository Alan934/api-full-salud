import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
// import { ControllerFactory } from '../../common/factories/controller.factory';
import {
  CreatePaymentDto,
  UpdatePaymentDto,
  SerializerPaymentDto
} from '../../domain/dtos';
import { Payment } from '../../domain/entities';
import { PaymentService } from './payment.service';
import { AuthGuard, Roles, RolesGuard } from '../auth/guards/auth.guard';
import { Role } from '../../domain/enums';
import { toDto, toDtoList } from '../../common/util/transform-dto.util';
import { ApiPaginationResponse } from '../../common/swagger/api-pagination-response';
import { PaymentFilteredPaginationDto } from '../../domain/dtos/payment/payment-filtered-pagination.dto';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly service: PaymentService) { }

  @Post()
  @Roles(Role.ADMIN, Role.PRACTITIONER)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Create a new payment' })
  @ApiResponse({
    status: 201,
    description: 'The created payment',
    type: SerializerPaymentDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Social work or practitioner role not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
   async create(@Body() createDto: CreatePaymentDto): Promise<SerializerPaymentDto> {
    const entity = await this.service.create(createDto);
    return toDto(SerializerPaymentDto, entity);
  }

  @Get()
  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.SECRETARY, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Get all payments with optional filtering and pagination',
    description: 'Retrieve a list of payments, filtered by social work, practitioner role, and payment time, with pagination.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of practitionerRoles retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid pagination parameters' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  @ApiPaginationResponse(SerializerPaymentDto)
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiQuery({ name: 'socialWorkId', required: false, type: String, description: 'Filter by Social Work ID' })
  @ApiQuery({ name: 'practitionerRoleId', required: false, type: String, description: 'Filter by Practitioner Role ID' })
  @ApiQuery({ name: 'paymentTime', required: false, type: Number, description: 'Filter by payment time (in minutes)' })
  async findAllPaginated(
    @Query() filterPaginationDto: PaymentFilteredPaginationDto,
  ): Promise<{ data: SerializerPaymentDto[]; lastPage: number; total: number; msg?: string }> {
    const { data, lastPage, total, msg } = await this.service.findAllPaginated(filterPaginationDto);
    const serializedData = toDtoList(SerializerPaymentDto, data);
    return { data: serializedData, total, lastPage, msg };
  }
  

  @Get(':id')
  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.SECRETARY, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Get a specific payment by ID' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({
    status: 200,
    description: 'The requested payment',
    type: SerializerPaymentDto
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async getOne(@Param('id') id: string): Promise<SerializerPaymentDto> {
    const entity = await this.service.getOne(id);
    return toDto(SerializerPaymentDto, entity);
  }

  @Get('practitioner/:practitionerRoleId')
  @ApiOperation({ summary: 'Get all payments for a specific practitioner' })
  @ApiParam({ name: 'practitionerId', description: 'Practitioner ID' })
  @ApiResponse({
    status: 200,
    description: 'List of payments for the practitioner',
    type: [SerializerPaymentDto]
  })
  @ApiResponse({ status: 404, description: 'No payments found for this practitioner' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async getByPractitionerId(@Param('practitionerRoleId') practitionerRoleId: string) {
    return await this.service.getByPractitionerRoleId(practitionerRoleId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.PRACTITIONER)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Update an existing payment by ID' })
  @ApiParam({ name: 'id', description: 'Payment ID to update' })
  @ApiResponse({
    status: 200,
    description: 'The updated payment',
    type: SerializerPaymentDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePaymentDto,
  ): Promise<SerializerPaymentDto> {
    const entity = await this.service.update(id, updateDto);
    return toDto(SerializerPaymentDto, entity);
  }

  @Delete('soft-delete/:id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Soft delete a payment' })
  @ApiParam({ name: 'id', description: 'Payment ID to soft delete' })
  @ApiResponse({
    status: 200,
    description: 'Message confirming soft deletion',
    schema: { example: { message: 'Payment with ID "..." soft deleted successfully' } },
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async softDelete(@Param('id') id: string): Promise<{ message: string }> {
    return this.service.softDeleted(id);
  }

  @Patch('recover/:id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Recover a soft-deleted payment' })
  @ApiParam({ name: 'id', description: 'Payment ID to recover' })
  @ApiResponse({
    status: 200,
    description: 'The recovered payment',
    type: SerializerPaymentDto,
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @ApiResponse({ status: 400, description: 'Payment is not soft-deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
   async recover(@Param('id') id: string): Promise<SerializerPaymentDto> {
    const entity = await this.service.recover(id);
    return toDto(SerializerPaymentDto, entity);
  }
}
