import { Controller, Get, Post, Body, Patch, Param, Delete, Res, UseGuards } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { CreatePdfDto } from '../../domain/dtos/pdf/create-pdf.dto';
import { UpdatePdfDto } from '../../domain/dtos/pdf/update-pdf.dto';
import { buffer } from 'stream/consumers';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard, Roles, RolesGuard } from '../auth/guards/auth.guard';
import { Role } from '../../domain/enums';


@Controller('pdf')
//https://www.youtube.com/watch?v=3vg-9yr4hTE&list=PLt0PVme_2Q1sDvfV_b6hnb-ct0yl2plV2&index=2
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}
  
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PATIENT, Role.SECRETARY)
  @ApiBearerAuth('bearerAuth')
  @Post('create')
  @ApiOperation({ summary: 'Create PDF, desde el id pasado' })
  @ApiResponse({ status: 200, description: 'Descarga de PDF' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async createPDF(@Res() res,  @Body() createPdfDto: CreatePdfDto): Promise<void> {
    const buffer = await this.pdfService.createPdfReceta(createPdfDto)
    res.set({
      'ContentType': 'application/json',
      'Content-Disposition' : 'attachment: filename=receta.pdf',
      'Content-length': buffer.length
    })
    res.end(buffer)
  }

  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PATIENT, Role.SECRETARY)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('downloadIndications')
  @ApiOperation({ summary: 'Create PDF, desde el id pasado' })
  @ApiResponse({ status: 200, description: 'Descarga de PDF' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async IndicationsPDF(@Res() res,  @Body() createPdfDto: CreatePdfDto): Promise<void> {
    const buffer = await this.pdfService.createPdfIndicaciones(createPdfDto)
    res.set({
      'ContentType': 'application/json',
      'Content-Disposition' : 'attachment: filename=receta.pdf',
      'Content-length': buffer.length
    })
    res.end(buffer)
  }

  //download files
  //https://www.youtube.com/watch?v=vVAlzmF8tfw&list=PLt0PVme_2Q1sDvfV_b6hnb-ct0yl2plV2&index=6
  // @Get(":filename")
  // downloadFile(@Param('filename') FilterRuleName, @Res() res): Observable<Object>{
  // return off(res.sendFile(join(process.cwd(), 'uploads/'+filename)))
  // }

}
