import { Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { SerializerNotificationDto } from '../../domain/dtos';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { toDto } from '../../common/util/transform-dto.util';
import { PaginatedNotificationDto } from '../../domain/dtos/notification/paginatedNotificationsDto';
import { AuthGuard, Roles, RolesGuard } from '../auth/guards/auth.guard';
import { Role } from '../../domain/enums';
import { PaginationDto } from '../../common/dtos';
import { PaginationMetadata } from '../../common/util/pagination-data.util';
@ApiTags('Notification')
@Controller('notification')
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get("getByPatient")
  @ApiOperation({ summary: 'Buscar notificaciones por id de paciente ' })
  @ApiParam({ name: 'id', description: 'UUID de la notificacion', type: String })
  @ApiResponse({ status: 200, description: 'Notificacion Encontradas', 
    type: SerializerNotificationDto })
  @ApiResponse({ status: 404, description: 'Notificacion no encontrada' })
  @ApiResponse({ status: 400, description: 'Bad request' }) 
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async getNotificationByPatient(
    @Query('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ): Promise<PaginatedNotificationDto>{
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const { notifications, total, previousPage } = await this.service.getNotificationByPatient(patientId, pageNumber, limitNumber);
      return {
        notifications: notifications.map((notification) => toDto(SerializerNotificationDto, notification)),        total,
        page: pageNumber,
        limit: limitNumber,
        previousPage,
      };
  }

  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get("getByPractitioner")
  @ApiOperation({ summary: 'Buscar notificaciones por id de paciente ' })
  @ApiParam({ name: 'id', description: 'UUID de la Notificacion', type: String })
  @ApiResponse({ status: 200, description: 'Notificaciones encontradas', 
    type: SerializerNotificationDto })
  @ApiResponse({ status: 404, description: 'Notificacion no encontrada' })
  @ApiResponse({ status: 400, description: 'Bad request' }) 
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async getNotificationByPractitioner(
    @Query('practitionerId', new ParseUUIDPipe({ version: '4' })) practitionerId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ): Promise<PaginatedNotificationDto>{
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const { notifications, total, previousPage } = await this.service.getNotificationByPracttioner(practitionerId, pageNumber, limitNumber);
      return {
        notifications: notifications.map((notification) => toDto(SerializerNotificationDto, notification)),
        total,
        page: pageNumber,
        limit: limitNumber,
        previousPage,
      };
  }

  @Roles(Role.PRACTITIONER, Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Delete('/soft-delete/:id')
  @ApiOperation({ summary: 'Eliminar un registro lógicamente' })
  @ApiResponse({ status: 204, description: 'practitionerRole deleted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' }) 
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  @ApiNotFoundResponse({
    description: 'Record not found'
  })
  @ApiOkResponse({
    description: 'Record soft deleted successfully'
  })
    softRemove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
      return this.service.softRemove(id);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Patch('restore/:id')
  @ApiOperation({
    summary: 'Recuperar un registro lógicamente eliminado'
  })
  @ApiNotFoundResponse({
    description: 'Record not found or not deleted'
  })
  @ApiOkResponse({
    description: 'Record restored successfully',
    type: SerializerNotificationDto
  })
  @ApiResponse({ status: 200, description: 'Notification recovered successfully' })
  @ApiResponse({ status: 404, description: 'Notification not found or not deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async restore(@Param('id',new ParseUUIDPipe({ version: '4' })) id: string) {
    const data = await this.service.restore(id);

    return toDto(SerializerNotificationDto, data);
  }

  @Roles(Role.ADMIN, Role.PRACTITIONER, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('paginated')
  @ApiOperation({ summary: 'Obtener todas las notificaciones paginadas' })
  @ApiResponse({ status: 200, description: 'Notificaciones obtenidas', type: SerializerNotificationDto, isArray: true })
  @ApiResponse({ status: 400, description: 'Invalid pagination parameters' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async findAllPaginated(
    @Query() paginationDto: PaginationDto
  ): Promise<{ data: SerializerNotificationDto[]; meta: PaginationMetadata }> {
    return await this.service.findAllPaginated(paginationDto);
  }
}
