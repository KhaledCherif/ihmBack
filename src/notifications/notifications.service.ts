import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export type RequestNotificationPayload = {
  to: string[];
  requestId: number;
  event: string;
  status: string;
  message: string;
  actorName?: string;
  serviceTitle?: string;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly transporter: nodemailer.Transporter | null;

  constructor() {
    this.transporter = this.createTransporter();
  }

  async sendRequestLifecycleNotification(
    payload: RequestNotificationPayload,
  ): Promise<void> {
    const recipients = Array.from(new Set(payload.to.filter(Boolean)));
    if (!this.transporter || recipients.length === 0) {
      return;
    }

    const from = process.env.MAIL_FROM ?? process.env.SMTP_USER;
    if (!from) {
      this.logger.warn('MAIL_FROM or SMTP_USER is missing. Skipping email send.');
      return;
    }

    const subject = `[Request #${payload.requestId}] ${payload.event}`;
    const html = this.renderRequestLifecycleEmail(payload);

    try {
      await this.transporter.sendMail({
        from,
        to: recipients.join(','),
        subject,
        html,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to send request lifecycle email: ${message}`);
    }
  }

  private createTransporter(): nodemailer.Transporter | null {
    const host = process.env.SMTP_HOST ?? 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT ?? 587);
    const secure =
      (process.env.SMTP_SECURE ?? '').toLowerCase() === 'true' || port === 465;
    const user =
      process.env.SMTP_USER ??
      process.env.MAIL_USER ??
      process.env.GMAIL_USER ??
      this.extractEmailAddress(process.env.MAIL_FROM);

    const rawPass =
      process.env.SMTP_PASS ??
      process.env.SMTP_APP_PASSWORD ??
      process.env.APP_PASSWORD ??
      process.env.app_password;

    const pass = rawPass ? rawPass.replace(/\s+/g, '') : null;

    if (!user || !pass) {
      this.logger.warn(
        'Notifications transporter not initialized. Missing SMTP_USER and/or SMTP_PASS(APP_PASSWORD).',
      );
      return null;
    }

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  private extractEmailAddress(value?: string): string | null {
    if (!value) {
      return null;
    }

    const match = value.match(/<([^>]+)>/);
    if (match?.[1]) {
      return match[1];
    }

    return value.includes('@') ? value : null;
  }

  private renderRequestLifecycleEmail(payload: RequestNotificationPayload): string {
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Request #${payload.requestId} update</h2>
        <p><strong>Event:</strong> ${payload.event}</p>
        <p><strong>Status:</strong> ${payload.status}</p>
        ${payload.actorName ? `<p><strong>By:</strong> ${payload.actorName}</p>` : ''}
        ${payload.serviceTitle ? `<p><strong>Service:</strong> ${payload.serviceTitle}</p>` : ''}
        <p>${payload.message}</p>
      </div>
    `;
  }
}
