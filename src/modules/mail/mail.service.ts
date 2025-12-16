import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { envConfig } from '../../config/envs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {

    constructor(private readonly configService: ConfigService) {}



    mailTransport() {
        const transporter = nodemailer.createTransport({
            host: envConfig.EMAIL_HOST,
            port: envConfig.EMAIL_PORT,
            secure: false, // true for port 465, false for other ports
            auth: {
              user: envConfig.GOOGLE_USER, // generated ethereal user
              pass: envConfig.GOOGLE_PASSWORD, // generated ethereal password
            },
        });

        return transporter;
    }

    async sendMail(to: string, subject: string, html?: string) {
        const transporter = this.mailTransport();

        const mailOptions = {
            from: envConfig.GOOGLE_USER, // Sender address
            to, // Recipient address
            subject, // Subject line
            html, // HTML body (optional)
        };

        try {
            const info = await transporter.sendMail(mailOptions);
            return info;
        } catch (error) {
            throw error;
        }
    }
}
