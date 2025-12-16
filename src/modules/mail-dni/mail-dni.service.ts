import { BadRequestException, Injectable } from "@nestjs/common";
import nodemailer from 'nodemailer';
import { envConfig } from '../../config/envs';
import { ConfigService } from "@nestjs/config";
import { MailDniDto } from "../../domain/dtos/mail-dni/mail-dni.dto";

const EMAIL = "pruebarodrigo42@gmail.com"
const APPPASS = "svfq yedi cnit hobe"

@Injectable()
export class MailDniService {

    constructor(private readonly configService: ConfigService) {}

    mailTransport() {
        const transporter = nodemailer.createTransport({
            host: envConfig.EMAIL_HOST,
            port: envConfig.EMAIL_PORT,
            secure: false,
            auth: {
                user: EMAIL,
                pass: APPPASS
            },
        });
    
        return transporter;
    }

    async sendEmailDNI(
        file: Express.Multer.File,
        mail: MailDniDto
    ): Promise<string> {

        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        // Validar el tipo de archivo
        const allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp'
        ];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException(
                'Invalid file type. Only JPEG, PNG, GIF, and WEBP are allowed'
            );
        }

        // Validar el tamaño del archivo
        const maxFileSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxFileSize) {
            throw new BadRequestException(
                'File size exceeds the maximum allowed size of 5MB'
            );
        }

        // Envío del email
        const transporter = this.mailTransport();

        const message = `
            <p><strong>Nombre: </strong>${mail.name},</p>
            <p><strong>Email: </strong>${mail.email}</p> <br>
        `;

        const attachments = [
            {
                filename: file.originalname,
                content: file.buffer,
            },
        ];

        const mailOptions = {
            from: EMAIL,
            to: EMAIL, 
            subject: `${mail.name} ha subido su DNI `,
            html: message,
            attachments: attachments,
        };

        try {
            await transporter.sendMail(mailOptions);
            return "Email sent successfully. ";

        } catch (error) {
            throw new BadRequestException('Failed to send mail. ');
        }

    }

}
