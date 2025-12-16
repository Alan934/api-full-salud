import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { MailQueueProcessor } from './mail.queue';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // Load environment variables globally
    BullModule.registerQueue({
      name: 'email', //queue name
    })
  ],
  controllers: [],
  providers: [MailService, MailQueueProcessor],
  exports: [MailService, MailQueueProcessor],
})
export class MailModule {}
