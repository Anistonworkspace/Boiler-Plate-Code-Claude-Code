import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { emailQueue } from '../jobs/queues.js';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER && env.SMTP_PASS
      ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
      : undefined,
  });
  return transporter;
}

export const emailService = {
  async sendNow(payload: EmailPayload): Promise<void> {
    if (!env.SMTP_HOST) {
      // Silently skip in dev when SMTP_HOST is unset — email.service is functional otherwise
      return;
      return;
    }
    await getTransporter().sendMail({
      from: env.SMTP_FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
  },

  async queue(payload: EmailPayload, delayMs = 0): Promise<void> {
    await emailQueue.add('send', payload, { delay: delayMs, attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
  },
};
