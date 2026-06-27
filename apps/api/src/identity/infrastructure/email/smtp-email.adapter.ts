import { Inject, Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { APP_ENV } from '../../../config/config.module';
import type { Env } from '../../../config/env';
import type { EmailPort } from '../../application/ports/out/email.port';

/**
 * Envío de email por SMTP (nodemailer). Si NO hay SMTP configurado (dev), cae a un fallback que
 * LOGUEA el contenido (incluido el link) en vez de fallar — así la feature es completa y enviará de
 * verdad en cuanto se configuren las variables SMTP_*. Sin proveedor acoplado (cualquier SMTP sirve).
 */
@Injectable()
export class SmtpEmailAdapter implements EmailPort {
  private readonly logger = new Logger(SmtpEmailAdapter.name);
  private readonly transporter: Transporter | null;

  constructor(@Inject(APP_ENV) private readonly env: Env) {
    this.transporter = env.SMTP_HOST
      ? createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_PORT === 465, // 465 = SMTPS implícito; 587 = STARTTLS
          auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
        })
      : null;
  }

  async sendAccountDeletionLink(to: string, link: string): Promise<void> {
    const subject = 'Confirma el borrado de tu cuenta OSIA';
    const text =
      `Recibimos una solicitud para borrar tu cuenta de OSIA.\n\n` +
      `Confirma aquí (el enlace vence en 24 horas):\n${link}\n\n` +
      `Si no fuiste tú, ignora este mensaje: tu cuenta queda intacta.`;
    await this.send(to, subject, text);
  }

  private async send(to: string, subject: string, text: string): Promise<void> {
    if (!this.transporter) {
      // Dev sin SMTP: se registra el cuerpo (con el link) para poder probar de extremo a extremo. En
      // PRODUCCIÓN NO se loguea el cuerpo: llevaría el token de borrado EN CLARO a los logs (§8).
      const detail = this.env.isProd ? '' : `\n${text}`;
      this.logger.warn(`[email no enviado: SMTP sin configurar] para=${to} asunto="${subject}"${detail}`);
      return;
    }
    await this.transporter.sendMail({ from: this.env.EMAIL_FROM, to, subject, text });
  }
}
