import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Server, Socket } from 'socket.io';
import { Activation } from './activation.schema';

const room = (activationId: string) => `activation:${activationId}`;

@WebSocketGateway({ cors: { origin: '*' } })
export class ActivationsGateway {
  @WebSocketServer()
  server!: Server;

  constructor(
    @InjectModel(Activation.name)
    private readonly activationModel: Model<Activation>,
  ) {}

  /**
   * El cliente se suscribe a una activación. Se lo une a la sala primero,
   * para no perder eventos, y se le devuelve la foto de lo que ya pasó.
   */
  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @MessageBody() activationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    await client.join(room(activationId));

    const activation = await this.activationModel.findById(activationId).lean();

    return {
      status: activation?.status ?? 'UNKNOWN',
      history: activation?.history ?? [],
    };
  }

  /** Empuja un evento nuevo a todos los suscriptos de esa activación. */
  emitEvent(activationId: string, eventType: string, at: Date) {
    this.server
      .to(room(activationId))
      .emit('activation.event', { activationId, eventType, at });
  }
}