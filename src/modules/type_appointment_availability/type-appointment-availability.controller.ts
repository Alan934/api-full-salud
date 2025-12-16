import { Controller, Post, Body, Get, Query, Param, Patch, Delete, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { TypeAppointmentAvailabilityService } from "./type-appointment-availability.service";
import { CreateTypeAppointmentAvailabilityDto, UpdateTypeAppointmentAvailabilityDto } from "../../domain/dtos/type_appointment_availability/type-appointment-availability.dto";
import { PaginationDto } from "../../common/dtos/pagination-common.dto";
import { AuthGuard, Roles, RolesGuard } from "../auth/guards/auth.guard";
import { Role } from "../../domain/enums";
import { ApiPaginationResponse } from "../../common/swagger/api-pagination-response";
import { TypeAppointmentAvailability } from "../../domain/entities";

@ApiTags('Type Appointment Availability')
@ApiBearerAuth('bearerAuth')
@Controller('type-appointment-availability')
export class TypeAppointmentAvailabilityController {
    
    constructor(private readonly service: TypeAppointmentAvailabilityService) {}

    @Post()
    @Roles(Role.ADMIN)
    @UseGuards(AuthGuard, RolesGuard)
    @ApiOperation({ summary: 'Create a new type appointment availability' })
    @ApiResponse({ status: 201, description: 'Availability created successfully', type: TypeAppointmentAvailability })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    @ApiResponse({ status: 404, description: 'Type appointment not found' })
    @ApiResponse({ status: 409, description: 'Availability already exists for this day and type appointment' })
    async create(@Body() createDto: CreateTypeAppointmentAvailabilityDto): Promise<TypeAppointmentAvailability> {
        return await this.service.create(createDto);
    }

    @Get()
    @Roles(Role.ADMIN, Role.PRACTITIONER, Role.SECRETARY)
    @UseGuards(AuthGuard, RolesGuard)
    @ApiOperation({ summary: 'Get all type appointment availabilities' })
    @ApiResponse({ status: 200, description: 'List of availabilities retrieved successfully' })
    @ApiPaginationResponse(TypeAppointmentAvailability)
    async findAll(@Query() paginationDto: PaginationDto): Promise<{
        data: TypeAppointmentAvailability[];
        meta: any;
    }> {
        return await this.service.findAll(paginationDto);
    }

    @Get(':id')
    @Roles(Role.ADMIN, Role.PRACTITIONER, Role.SECRETARY)
    @UseGuards(AuthGuard, RolesGuard)
    @ApiOperation({ summary: 'Get a specific availability by ID' })
    @ApiParam({ name: 'id', description: 'ID of the availability' })
    @ApiResponse({ status: 200, description: 'Availability found', type: TypeAppointmentAvailability })
    @ApiResponse({ status: 404, description: 'Availability not found' })
    async findOne(@Param('id') id: string): Promise<TypeAppointmentAvailability> {
        return await this.service.findOne(id);
    }

    @Get('by-type/:typeAppointmentId')
    @Roles(Role.ADMIN, Role.PRACTITIONER, Role.SECRETARY)
    @UseGuards(AuthGuard, RolesGuard)
    @ApiOperation({ summary: 'Get all availabilities for a specific type appointment' })
    @ApiParam({ name: 'typeAppointmentId', description: 'ID of the type appointment' })
    @ApiResponse({ status: 200, description: 'List of availabilities found', type: [TypeAppointmentAvailability] })
    async findByTypeAppointment(@Param('typeAppointmentId') typeAppointmentId: string): Promise<TypeAppointmentAvailability[]> {
        return await this.service.findByTypeAppointment(typeAppointmentId);
    }

    @Patch(':id')
    @Roles(Role.ADMIN)
    @UseGuards(AuthGuard, RolesGuard)
    @ApiOperation({ summary: 'Update an availability' })
    @ApiParam({ name: 'id', description: 'ID of the availability to update' })
    @ApiResponse({ status: 200, description: 'Availability updated successfully', type: TypeAppointmentAvailability })
    @ApiResponse({ status: 404, description: 'Availability not found' })
    async update(
        @Param('id') id: string,
        @Body() updateDto: UpdateTypeAppointmentAvailabilityDto
    ): Promise<TypeAppointmentAvailability> {
        return await this.service.update(id, updateDto);
    }

    @Delete('soft-delete/:id')
    @Roles(Role.ADMIN)
    @UseGuards(AuthGuard, RolesGuard)
    @ApiOperation({ summary: 'Soft delete an availability' })
    @ApiParam({ name: 'id', description: 'ID of the availability to soft delete' })
    @ApiResponse({ status: 200, description: 'Availability soft deleted successfully' })
    @ApiResponse({ status: 404, description: 'Availability not found' })
    async softDelete(@Param('id') id: string): Promise<{ message: string }> {
        return await this.service.softDelete(id);
    }

    @Patch('recover/:id')
    @Roles(Role.ADMIN)
    @UseGuards(AuthGuard, RolesGuard)
    @ApiOperation({ summary: 'Recover a soft-deleted availability' })
    @ApiParam({ name: 'id', description: 'ID of the availability to recover' })
    @ApiResponse({ status: 200, description: 'Availability recovered successfully', type: TypeAppointmentAvailability })
    @ApiResponse({ status: 404, description: 'Availability not found' })
    @ApiResponse({ status: 409, description: 'Availability is not deleted' })
    async recover(@Param('id') id: string): Promise<TypeAppointmentAvailability> {
        return await this.service.recover(id);
    }
}