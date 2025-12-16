import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PractitionerService } from '../modules/practitioner/practitioner.service';

@Injectable()
export class PractitionerCleanUpService {
  private readonly logger = new Logger(PractitionerCleanUpService.name);

  constructor(private readonly practitionerService: PractitionerService) { }
  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    const minutes = new Date(Date.now() - 15 * 60 * 1000); // 15 minutos
    const deletedCount = await this.practitionerService.deleteInactivePractitioners(minutes);

    if (deletedCount > 0) {
      this.logger.log(`Eliminados ${deletedCount} practitioners inactivos`);
    }
  }
}
