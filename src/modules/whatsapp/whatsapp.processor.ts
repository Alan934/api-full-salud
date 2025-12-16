import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { WhatsAppService } from './whatsapp.service';

@Processor('whatsapp')
export class WhatsAppProcessor {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Process('sendMessage')
  async handleSendMessage(job: Job<{ to: string; message: string }>) {
    const { to, message } = job.data;

    try {
      console.log(`Processing WhatsApp message job for ${to}`);
      await this.whatsappService.sendMessage(to, message);
      console.log(`WhatsApp message sent successfully to ${to}`);
    } catch (error) {
      console.error(`Failed to send WhatsApp message to ${to}:`, (error as Error).message);
      throw error; // Let Bull handle retries if configured
    }
  }
}