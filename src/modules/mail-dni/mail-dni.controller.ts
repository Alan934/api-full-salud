import { Body, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { ApiBearerAuth, ApiResponse, ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthGuard, Roles, RolesGuard } from '../auth/guards/auth.guard';
import { MailDniService } from "./mail-dni.service";
import { Role } from "../../domain/enums";
import { MailDniDto } from "../../domain/dtos/mail-dni/mail-dni.dto";



@ApiTags('MailDNI')
@Controller('mail-dni')
export class MailDniController {
    constructor(protected readonly mailDniService: MailDniService) {}

    @Roles(Role.PRACTITIONER, Role.ADMIN)
    @UseGuards(AuthGuard, RolesGuard)
    @Post('upload')
    @ApiBearerAuth('bearerAuth')
    @ApiResponse({ status: 200, description: 'Imagen de DNI enviada exitosamente' })
    @UseInterceptors(FileInterceptor('image'))
    async sendEmailDni(
        @UploadedFile() file: Express.Multer.File,
        @Body() mailDniDto: MailDniDto,
    ): Promise<{ message: string }> {
        const message = await this.mailDniService.sendEmailDNI(file, mailDniDto);
        return { message };
    }

}
