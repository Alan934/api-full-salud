import { Controller, Get, Headers, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppointmentSchedulerService } from './appointment.scheduler';

@ApiTags('Internal Cron')
@Controller('internal/cron/appointments')
export class AppointmentCronController {
  constructor(private readonly scheduler: AppointmentSchedulerService) {}

  private isAuthorized(secret?: string): boolean {
    const expected = process.env.CRON_SECRET;
    return !!expected && !!secret && secret === expected;
  }

  private isVercelCron(xVercelCron?: string): boolean {
    // Vercel adds this header for cron invocations
    return typeof xVercelCron !== 'undefined' && xVercelCron !== null && xVercelCron !== '';
  }

  private extractSecret(
    headerSecret?: string,
    querySecret?: string,
    authorization?: string
  ): string | undefined {
    if (headerSecret) return headerSecret;
    if (querySecret) return querySecret;
    if (authorization && authorization.startsWith('Bearer ')) {
      return authorization.slice('Bearer '.length);
    }
    return undefined;
  }

  @Get('absent-daily')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger daily absent sweep (GET for Vercel Cron)' })
  async runAbsentDailyGet(
    @Headers('x-cron-secret') headerSecret?: string,
    @Query('secret') querySecret?: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-vercel-cron') xVercelCron?: string
  ) {
    const secret = this.extractSecret(headerSecret, querySecret, authorization);
    if (!(this.isAuthorized(secret) || this.isVercelCron(xVercelCron))) {
      return { ok: false, error: 'unauthorized' };
    }
    await this.scheduler.markPreviousDayPendingAsAbsent();
    return { ok: true };
  }

  @Post('absent-daily')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger daily absent sweep (yesterday pending -> absent)' })
  @ApiBearerAuth('bearerAuth')
  async runAbsentDaily(
    @Headers('x-cron-secret') headerSecret?: string,
    @Query('secret') querySecret?: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-vercel-cron') xVercelCron?: string
  ) {
    const s = this.extractSecret(headerSecret, querySecret, authorization);
    if (!(this.isAuthorized(s) || this.isVercelCron(xVercelCron))) {
      return { ok: false, error: 'unauthorized' };
    }
    await this.scheduler.markPreviousDayPendingAsAbsent();
    return { ok: true };
  }

  @Get('reminder-24h')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger 24h reminder window (GET for Vercel Cron every 5min)' })
  async runReminder24h(
    @Headers('x-cron-secret') headerSecret?: string,
    @Query('secret') querySecret?: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-vercel-cron') xVercelCron?: string
  ) {
    const secret = this.extractSecret(headerSecret, querySecret, authorization);
    if (!(this.isAuthorized(secret) || this.isVercelCron(xVercelCron))) {
      return { ok: false, error: 'unauthorized' };
    }
    await this.scheduler.reminder24hCron();
    return { ok: true };
  }

  @Get('reminder-3h')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger 3h reminder window (GET for Vercel Cron every 5min)' })
  async runReminder3h(
    @Headers('x-cron-secret') headerSecret?: string,
    @Query('secret') querySecret?: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-vercel-cron') xVercelCron?: string
  ) {
    const secret = this.extractSecret(headerSecret, querySecret, authorization);
    if (!(this.isAuthorized(secret) || this.isVercelCron(xVercelCron))) {
      return { ok: false, error: 'unauthorized' };
    }
    await this.scheduler.reminder3hCron();
    return { ok: true };
  }
}
