import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { MailService } from './mail.service';

@Processor('email')
export class MailQueueProcessor {
  constructor(private readonly mailService: MailService) {}

  @Process('sendEmail')
  async handleSendEmail(job: Job) {
    const { to, subject, text } = job.data;
    await this.mailService.sendMail(to, subject, text);
  }
}