import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createTransport } from 'nodemailer';
import type {
  ActivationCompletedEvent,
  ActivationFailedEvent,
} from '@activation-poc/contracts';
import { SentNotification } from './sent-notification.schema';

type EventRef = { correlationId: string; customerId: string; eventType: string };

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  // Mailhog recibe el SMTP en el puerto 1025, sin usuario ni TLS.
    private readonly transporter = createTransport({
    host: process.env.MAIL_HOST ?? 'localhost',
    port: Number(process.env.MAIL_PORT ?? 1025),
    secure: false,
    ignoreTLS: true,
  });
  
  constructor(
    @InjectModel(SentNotification.name)
    private readonly notificationModel: Model<SentNotification>,
  ) {}

  async notifyCompleted(event: ActivationCompletedEvent) {
    await this.send(
      event,
      '¡Tu plan ya está activo!',
      `Hola,\n\nTu activación ${event.correlationId} se completó correctamente. ` +
        `Ya podés usar tu servicio.\n\n¡Bienvenido!`,
    );
  }

  async notifyFailed(event: ActivationFailedEvent) {
    await this.send(
      event,
      'No pudimos activar tu plan',
      `Hola,\n\nTu activación ${event.correlationId} no se pudo completar.\n` +
        `Motivo: ${event.payload.reason}\n\n` +
        `No se te va a cobrar nada. Podés volver a intentarlo.`,
    );
  }

  private async send(event: EventRef, subject: string, text: string) {
    const activationId = event.correlationId;

    // No mandar dos veces el mismo email para la misma activación.
    const alreadySent = await this.notificationModel.exists({
      activationId,
      eventType: event.eventType,
    });
    if (alreadySent) {
      this.logger.warn(
        `Ya se envió el email de ${event.eventType} (activación ${activationId}), se ignora`,
      );
      return;
    }

    const to = `${event.customerId.toLowerCase()}@clientes.demo`;

    await this.transporter.sendMail({
      from: 'no-reply@activacion.demo',
      to,
      subject,
      text,
    });

    await this.notificationModel.create({
      activationId,
      eventType: event.eventType,
      to,
      subject,
    });

    this.logger.log(
      `Email enviado a ${to}: "${subject}" (activación ${activationId})`,
    );
  }
}