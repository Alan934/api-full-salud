import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Appointment } from '../../domain/entities';
import { AppointmentStatus } from '../../domain/enums';
import { envConfig } from '../../config/envs';
import moment from 'moment-timezone';

@Injectable()
export class AppointmentSchedulerService {
  private readonly logger = new Logger(AppointmentSchedulerService.name);
  private readonly tz = envConfig.APP_TIMEZONE || 'America/Argentina/Buenos_Aires';
  private readonly transientDbMessages = [
    'connection terminated due to connection timeout',
    'timeout waiting for connection',
    'client has encountered a connection error and is not queryable',
    'server closed the connection unexpectedly',
    'connection closed',
    'socket hang up',
    'read ECONNRESET',
    'write ECONNRESET',
    'etimedout',
    'transient transaction error'
  ];
  private readonly transientDbCodes = new Set([
    'ECONNRESET',
    'ETIMEDOUT',
    'EPIPE',
    'ECONNREFUSED',
    'ENETUNREACH',
    'EHOSTUNREACH'
  ]);

  constructor(
    @InjectRepository(Appointment) private readonly repo: Repository<Appointment>,
    @InjectQueue('email') private readonly emailQueue: Queue,
    // New: also use WhatsApp queue to send reminders in parallel to emails
    @InjectQueue('whatsapp') private readonly whatsappQueue: Queue,
  ) {}

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isTransientDbError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }
    const err = error as Record<string, any>;
    const code: string | undefined = typeof err.code === 'string' ? err.code : undefined;
    if (code && this.transientDbCodes.has(code)) {
      return true;
    }
    const message = (err.message ?? '').toString().toLowerCase();
    return this.transientDbMessages.some((m) => message.includes(m));
  }

  private async runWithDbRetry<T>(operation: () => Promise<T>, context: string, maxAttempts = 3): Promise<T> {
    let attempt = 0;
    let lastError: unknown;
    const baseDelay = 250;

    while (attempt < maxAttempts) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        attempt += 1;

        const isTransient = this.isTransientDbError(error);
        if (!isTransient || attempt >= maxAttempts) {
          this.logger.error(`[${context}] DB operation failed after ${attempt} attempt(s): ${(error as Error).message}`, (error as Error).stack);
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        this.logger.warn(`[${context}] transient DB error: ${(error as Error).message}. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxAttempts})`);
        await this.sleep(delay);
      }
    }

    throw lastError ?? new Error(`[${context}] DB operation failed without specific error`);
  }

  private async claimWhatsappReminder(turnId: string, field: 'whats24' | 'whats3'): Promise<boolean> {
    const update: Record<string, string> = {};
    update[field] = 'QUEUED';

    const result = await this.runWithDbRetry(
      () => this.repo.createQueryBuilder()
        .update(Appointment)
        .set(update)
        .where('id = :id', { id: turnId })
        .andWhere(`(${field} IS NULL OR ${field} = '' OR ${field} = :failed)`, { failed: 'FAILED' })
        .execute(),
      `claimWhatsappReminder:${field}`
    );

    return (result.affected ?? 0) > 0;
  }

  private async setWhatsappStatus(turnId: string, field: 'whats24' | 'whats3', status: 'SENT' | 'FAILED'): Promise<void> {
    const update: Record<string, string> = {};
    update[field] = status;
    await this.runWithDbRetry(
      () => this.repo.update({ id: turnId }, update as any),
      `setWhatsappStatus:${field}:${status}`
    );
  }

  private buildAppointmentHtml(opts: {
    patientName: string;
    practitionerName: string;
    date: string;
    hour: string;
    title: string;
    intro: string;
    ctaText?: string;
    ctaUrl?: string;
  }): string {
    const { patientName, practitionerName, date, hour, title, intro, ctaText, ctaUrl } = opts;
    return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
      </head>
      <body style="font-family: Arial, sans-serif; background:#f5f7fb; margin:0; padding:0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f7fb; padding:24px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.06); overflow:hidden;">
                <tr>
                  <td style="background:#0e9f6e; padding:20px; text-align:center;">
                    <h1 style="margin:0; color:#ffffff; font-size:20px;">${title}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 28px; color:#333333;">
                    <p style="margin:0 0 8px 0;">Hola <strong>${patientName}</strong>,</p>
                    <p style="margin:0 0 16px 0;">${intro}</p>
                    <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:12px 16px; margin:16px 0;">
                      <p style="margin:4px 0;"><strong>Profesional:</strong> ${practitionerName}</p>
                      <p style="margin:4px 0;"><strong>Fecha:</strong> ${date}</p>
                      <p style="margin:4px 0;"><strong>Hora:</strong> ${hour} hs</p>
                    </div>
                    ${ctaUrl && ctaText ? `<p style="text-align:center; margin:24px 0;"><a href="${ctaUrl}" style="display:inline-block; padding:12px 20px; background:#0e9f6e; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:bold;">${ctaText}</a></p>` : ''}
                    <p style="color:#6b7280; font-size:12px;">Si desea cancelar o reprogramar el turno, haga clic en el botón o desde su panel.</p>
                    <hr style="border:none; border-top:1px solid #e5e7eb; margin:20px 0;">
                    <p style="color:#9ca3af; font-size:11px; text-align:center; margin:8px 0;">⚠️ Este es un correo automático generado por el sistema. Por favor, no responder a este mensaje.</p>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f9fafb; padding:16px; text-align:center; color:#6b7280; font-size:12px;">
                    © 2025 Full Salud. Todos los derechos reservados.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`;
  }

  // Enviar recordatorios 24h antes (respaldo)
  @Cron('*/5 * * * *', { timeZone: envConfig.APP_TIMEZONE || 'America/Argentina/Buenos_Aires' })
  async reminder24hCron(): Promise<void> {
    try {
      const nowTz = moment.tz(this.tz);
      const start = nowTz.clone().add(24, 'hours');
      const end = start.clone().add(5, 'minutes');

      const dateStr = start.format('YYYY-MM-DD');
      const toMin = (m: moment.Moment) => m.hours() * 60 + m.minutes();
      const startMin = toMin(start);
      const endMin = toMin(end);

      this.logger.log(`[reminder24hCron] tz=${this.tz} now=${nowTz.format()} window=${start.format()}..${end.format()} date=${dateStr}`);

      const candidates = await this.runWithDbRetry(
        () => this.repo.find({
          where: {
            date: dateStr,
            status: In([AppointmentStatus.PENDING, AppointmentStatus.APPROVED]),
            deletedAt: null,
          },
          relations: ['patient', 'practitioner'] // 'patient.familyGroup', 'patient.familyGroup.headPatient',
        }),
        'reminder24hCron::findCandidates'
      );

      this.logger.log(`[reminder24hCron] candidates=${candidates.length}`);

      let withPhone = 0; let withPhonePending = 0;
      for (const turn of candidates) {
        if (turn.patient?.phone) withPhone++;
        const [h, m] = (turn.hour || '').split(':').map(Number);
        const mins = (h || 0) * 60 + (m || 0);
        const inWindow = mins >= startMin && mins < endMin;
        if (!inWindow) { this.logger.debug(`[reminder24hCron][skip] appt=${turn.id} hour=${turn.hour} not in window startMin=${startMin} endMin=${endMin}`); continue; }

        // Email channel (independent)
        // Determinar el destinatario: headPatient si pertenece a un grupo familiar, sino el paciente mismo
        if (turn.patient?.email && !(turn as any).email24) {
          try {
            const patientName = turn.patient.name || 'Paciente';
            const recipientName = turn.patient.name || 'Paciente';
            const practitionerName = turn.practitioner?.name || 'Profesional';
            
            let intro: string;
            if (turn.patient.id === turn.patient.id) {
              // Recordatorio para el paciente mismo
              intro = 'Te recordamos que tenés un turno dentro de 24 horas.';
            } else {
              // Recordatorio al jefe de familia sobre el turno de un miembro
              intro = `Te recordamos que ${patientName} tiene un turno dentro de 24 horas.`;
            }
            
            const html = this.buildAppointmentHtml({
              patientName: recipientName,
              practitionerName,
              date: turn.date,
              hour: turn.hour,
              title: 'Recordatorio de turno (24 h)',
              intro,
              ctaText: 'Ver detalle / Reprogramar',
              //ctaUrl: `${envConfig.FRONTEND_URL}/paciente/turno/detalle/${turn.id}`,
            });
            this.logger.log(`[reminder24hCron] queueing email24 for appt=${turn.id} to=${turn.patient.email}`);
            await this.emailQueue.add(
              'sendEmail',
              { to: turn.patient.email, subject: 'Recordatorio: tenés un turno en 24 horas', html },
              {
                attempts: 3,
                backoff: { type: 'exponential', delay: 3000 },
                removeOnComplete: true,
                removeOnFail: false,
              }
            );
            await this.runWithDbRetry(
              () => this.repo.update({ id: turn.id }, { email24: 'SENT' } as any),
              'reminder24hCron::markEmail24'
            );
            this.logger.log(`[reminder24hCron] queued+marked email24 appt=${turn.id}`);
          } catch (e) {
            this.logger.error(`[reminder24hCron] failed to queue/send email24 appt=${turn.id} err=${(e as Error).message}`);
          }
        }

        // WhatsApp channel (independent)
        const whatsapp24Current = (turn as any).whats24 as string | undefined;

        const shouldAttemptWhatsapp24 = turn.patient?.phone && (!whatsapp24Current || whatsapp24Current === 'FAILED');
        if (shouldAttemptWhatsapp24) {
          this.logger.debug(`[reminder24hCron][whatsapp] candidate appt=${turn.id} phone=${turn.patient.phone} current=${whatsapp24Current ?? 'null'}`);
          const claimed = await this.claimWhatsappReminder(turn.id, 'whats24');
          if (!claimed) {
            this.logger.debug(`[reminder24hCron][whatsapp][skip-claimed] appt=${turn.id}`);
            continue;
          }
          try {
            const practitionerName = turn.practitioner?.name || 'Profesional';
            const patientName = turn.patient.name || 'Paciente';
            const recipientName = turn.patient.name || 'Paciente';
            // const baseUrl = envConfig.FRONTEND_URL;
            
            let message: string;
            // Recordatorio para el paciente
            message = `🏥 
            Full Salud\n
            Hola ${recipientName} 👋\n
            Recordatorio: tu turno es en 24 horas con ${practitionerName}\n
            📅 Fecha: ${turn.date}\n
            🕒 Hora: ${turn.hour} hs\n
            Si necesitás cancelar o reprogramar podés hacerlo desde el portal.\n
            Te esperamos ✅\n\n
            ⚠️ Este es un mensaje automático. Por favor, no responder.`;
            // Portal: ${baseUrl}\n abajo de Hora
            
            
            this.logger.log(`[reminder24hCron][whatsapp] queueing whats24 appt=${turn.id} to=${turn.patient.phone}`);
            const job = await this.whatsappQueue.add('sendMessage', { 
              to: turn.patient.phone, 
              message,
              name: recipientName,
              timeR: 24,
              doctor: practitionerName,
              fecha: turn.date,
              horaV: turn.hour
            }, {
              jobId: `whats24-${turn.id}-${turn.date}-${turn.hour}`,
              removeOnComplete: true,
              removeOnFail: false,
            });
            this.logger.log(`[reminder24hCron][whatsapp] queued jobId=${job.id} appt=${turn.id}`);
            await this.setWhatsappStatus(turn.id, 'whats24', 'SENT');
            withPhonePending++;
            this.logger.log(`[reminder24hCron][whatsapp] marked whats24 appt=${turn.id}`);
          } catch (e) {
            this.logger.error(`[reminder24hCron][whatsapp] failed appt=${turn.id} err=${(e as Error).message}`, (e as Error).stack);
            await this.setWhatsappStatus(turn.id, 'whats24', 'FAILED');
          }
        } else if (!turn.patient?.phone) {
          this.logger.debug(`[reminder24hCron][whatsapp][skip-no-phone] appt=${turn.id}`);
        } else if ((turn as any).whats24) {
          this.logger.debug(`[reminder24hCron][whatsapp][skip-flag-set] appt=${turn.id} whats24=${(turn as any).whats24}`);
        }
      }
      this.logger.log(`[reminder24hCron][summary] withPhone=${withPhone} queuedOrAlready=${withPhonePending}`);
    } catch (err) {
      this.logger.error(`Error reminder24hCron: ${(err as Error).message}`, (err as Error).stack);
    }
  }

  // Enviar recordatorios 3h antes (respaldo)
  @Cron('*/5 * * * *', { timeZone: envConfig.APP_TIMEZONE || 'America/Argentina/Buenos_Aires' })
  async reminder3hCron(): Promise<void> {
    try {
      const nowTz = moment.tz(this.tz);
      const start = nowTz.clone().add(3, 'hours');
      const end = start.clone().add(5, 'minutes');

      const dateStr = start.format('YYYY-MM-DD');
      const toMin = (m: moment.Moment) => m.hours() * 60 + m.minutes();
      const startMin = toMin(start);
      const endMin = toMin(end);

      this.logger.log(`[reminder3hCron] tz=${this.tz} now=${nowTz.format()} window=${start.format()}..${end.format()} date=${dateStr}`);

      const candidates = await this.runWithDbRetry(
        () => this.repo.find({
          where: {
            date: dateStr,
            status: In([AppointmentStatus.PENDING, AppointmentStatus.APPROVED]),
            deletedAt: null,
          },
          relations: ['patient', 'practitioner'] // 'patient.familyGroup', 'patient.familyGroup.headPatient', 
        }),
        'reminder3hCron::findCandidates'
      );

      this.logger.log(`[reminder3hCron] candidates=${candidates.length}`);

      let withPhone = 0; let withPhonePending = 0;
      for (const turn of candidates) {
        if (turn.patient?.phone) withPhone++;
        const [h, m] = (turn.hour || '').split(':').map(Number);
        const mins = (h || 0) * 60 + (m || 0);
        const inWindow = mins >= startMin && mins < endMin;
        if (!inWindow) { this.logger.debug(`[reminder3hCron][skip] appt=${turn.id} hour=${turn.hour} not in window startMin=${startMin} endMin=${endMin}`); continue; }

        // Email channel (independent)
        if (turn.patient?.email && !(turn as any).email3) {
          try {
            const patientName = turn.patient.name || 'Paciente';
            const recipientName = turn.patient.name || 'Paciente';
            const practitionerName = turn.practitioner?.name || 'Profesional';
            
            let intro: string;
            if (turn.patient.id === turn.patient.id) {
              // Recordatorio para el paciente mismo
              intro = 'Tu turno es dentro de 3 horas.';
            } else {
              // Recordatorio al jefe de familia sobre el turno de un miembro
              intro = `El turno de ${patientName} es dentro de 3 horas.`;
            }
            
            const html = this.buildAppointmentHtml({
              patientName: recipientName,
              practitionerName,
              date: turn.date,
              hour: turn.hour,
              title: 'Recordatorio de turno (3 h)',
              intro,
              ctaText: 'Ver detalle / Reprogramar',
              // ctaUrl: `${envConfig.FRONTEND_URL}/paciente/turno/detalle/${turn.id}`,
            });
            this.logger.log(`[reminder3hCron] queueing email3 for appt=${turn.id} to=${turn.patient.email}`);
            await this.emailQueue.add(
              'sendEmail',
              { to: turn.patient.email, subject: 'Recordatorio: tu turno es en 3 horas', html },
              {
                attempts: 3,
                backoff: { type: 'exponential', delay: 3000 },
                removeOnComplete: true,
                removeOnFail: false,
              }
            );
            await this.runWithDbRetry(
              () => this.repo.update({ id: turn.id }, { email3: 'SENT' } as any),
              'reminder3hCron::markEmail3'
            );
            this.logger.log(`[reminder3hCron] queued+marked email3 appt=${turn.id}`);
          } catch (e) {
            this.logger.error(`[reminder3hCron] failed to queue/send email3 appt=${turn.id} err=${(e as Error).message}`);
          }
        }

        // WhatsApp channel (independent)
        const whatsapp3Current = (turn as any).whats3 as string | undefined;
        // Determinar el destinatario: headPatient si pertenece a un grupo familiar, sino el paciente mismo
        const shouldAttemptWhatsapp3 = turn.patient?.phone && (!whatsapp3Current || whatsapp3Current === 'FAILED');
        if (shouldAttemptWhatsapp3) {
          this.logger.debug(`[reminder3hCron][whatsapp] candidate appt=${turn.id} phone=${turn.patient.phone} current=${whatsapp3Current ?? 'null'}`);
          const claimed = await this.claimWhatsappReminder(turn.id, 'whats3');
          if (!claimed) {
            this.logger.debug(`[reminder3hCron][whatsapp][skip-claimed] appt=${turn.id}`);
            continue;
          }
          try {
            const practitionerName = turn.practitioner?.name || 'Profesional';
            const patientName = turn.patient.name || 'Paciente';
            const recipientName = turn.patient.name || 'Paciente';
            //const baseUrl = envConfig.FRONTEND_URL;
            
            let message: string;
            // Recordatorio para el paciente
            message = `🏥 
            Full Salud\n
            Hola ${recipientName} 👋\n
            Recordatorio: tu turno es en 3 horas con ${practitionerName}\n
            📅 Fecha: ${turn.date}\n
            🕒 Hora: ${turn.hour} hs\n
            Si necesitás cancelar o reprogramar podés hacerlo desde el portal.\n
            Te esperamos ✅\n\n
            ⚠️ Este es un mensaje automático. Por favor, no responder.`;
            // Portal: ${baseUrl}\n abajo de Hora
            
            this.logger.log(`[reminder3hCron][whatsapp] queueing whats3 appt=${turn.id} to=${turn.patient.phone}`);
            const job = await this.whatsappQueue.add('sendMessage', { 
              to: turn.patient.phone, 
              message,
              name: recipientName,
              timeR: 3,
              doctor: practitionerName,
              fecha: turn.date,
              horaV: turn.hour
            }, {
              jobId: `whats3-${turn.id}-${turn.date}-${turn.hour}`,
              removeOnComplete: true,
              removeOnFail: false,
            });
            this.logger.log(`[reminder3hCron][whatsapp] queued jobId=${job.id} appt=${turn.id}`);
            await this.setWhatsappStatus(turn.id, 'whats3', 'SENT');
            withPhonePending++;
            this.logger.log(`[reminder3hCron][whatsapp] marked whats3 appt=${turn.id}`);
          } catch (e) {
            this.logger.error(`[reminder3hCron][whatsapp] failed appt=${turn.id} err=${(e as Error).message}`, (e as Error).stack);
            await this.setWhatsappStatus(turn.id, 'whats3', 'FAILED');
          }
        } else if (!turn.patient?.phone) {
          this.logger.debug(`[reminder3hCron][whatsapp][skip-no-phone] appt=${turn.id}`);
        } else if ((turn as any).whats3) {
          this.logger.debug(`[reminder3hCron][whatsapp][skip-flag-set] appt=${turn.id} whats3=${(turn as any).whats3}`);
        }
      }
      this.logger.log(`[reminder3hCron][summary] withPhone=${withPhone} queuedOrAlready=${withPhonePending}`);
    } catch (err) {
      this.logger.error(`Error reminder3hCron: ${(err as Error).message}`, (err as Error).stack);
    }
  }

  // Marca como ABSENT todos los turnos del día anterior que siguen en PENDING
  @Cron('0 3 * * *', { timeZone: envConfig.APP_TIMEZONE || 'America/Argentina/Buenos_Aires' })
  async markPreviousDayPendingAsAbsent(): Promise<void> {
    try {
      const prevDate = moment.tz(this.tz).subtract(1, 'day').format('YYYY-MM-DD');
      this.logger.log(`[markPreviousDayPendingAsAbsent] running for prevDate=${prevDate} tz=${this.tz}`);

      const result = await this.runWithDbRetry(
        () => this.repo.createQueryBuilder()
          .update(Appointment)
          .set({ status: AppointmentStatus.ABSENT })
          .where('date = :prevDate', { prevDate })
          .andWhere('status = :pending', { pending: AppointmentStatus.PENDING })
          .andWhere('deletedAt IS NULL')
          .execute(),
        'markPreviousDayPendingAsAbsent'
      );

      const affected = (result as any).affected ?? 0;
      this.logger.log(`Cron 3AM: Marcados ${affected} turnos como ABSENT para fecha ${prevDate}`);
    } catch (err) {
      this.logger.error(`Error markPreviousDayPendingAsAbsent: ${(err as Error).message}`, (err as Error).stack);
    }
  }
}
