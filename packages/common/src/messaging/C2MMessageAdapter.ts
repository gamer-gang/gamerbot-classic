import amqplib from 'amqplib';
import { Logger } from 'log4js';
import { EventEmitter } from 'stream';
import { amqp, assertAmqp, c2m, m2c } from './constants';
import { C2MEvents, M2CEvents } from './types';
import { makeMessage, parseMessage } from './utils';

export class C2MMessageAdapter extends EventEmitter {
  channel!: amqplib.Channel;
  constructor(public guildId: string, private txLogger: Logger, private rxLogger: Logger) {
    super();
  }
  async connect(): Promise<void> {
    assertAmqp();
    this.channel = await (await amqp).createChannel();
    await this.channel.assertQueue(c2m);
    await this.channel.assertQueue(m2c);
    this.#listen();
  }

  #listen(): void {
    this.channel.consume(m2c, msg => {
      if (!msg) return;

      const [id, guildId, command, ...args] = parseMessage(msg.content);
      this.rxLogger.debug(`m2c ${id} ${guildId} ${command} ${args.join(' ')}`);
      this.emit(command, id, guildId, ...args);
      this.channel.ack(msg);
    });
  }

  send<E extends keyof C2MEvents>(command: E, ...args: C2MEvents[E]): bigint;
  send(command: string, ...args: string[]): bigint {
    const [id, buffer] = makeMessage(command, this.guildId, ...args);
    this.txLogger.trace(
      `c2m ${id} ${this.guildId} ${command} ${args.join(' ')} [${buffer.length}]`
    );
    this.channel.assertQueue(c2m).then(({ queue }) => {
      this.channel.sendToQueue(queue, buffer);
    });
    return id;
  }

  on<E extends keyof M2CEvents>(
    event: E,
    callback: (id: bigint, guildId: bigint, ...args: M2CEvents[E]) => any
  ): this;
  on(event: string, callback: (...args: any[]) => any): this {
    return super.on(event, callback);
  }

  once<E extends keyof M2CEvents>(
    event: E,
    callback: (id: bigint, guildId: bigint, ...args: M2CEvents[E]) => any
  ): this;
  once(event: string, callback: (...args: any[]) => any): this {
    return super.once(event, callback);
  }

  off<E extends keyof M2CEvents>(
    event: E,
    callback: (id: bigint, guildId: bigint, ...args: M2CEvents[E]) => any
  ): this;
  off(event: string, callback: (...args: any[]) => any): this {
    return super.off(event, callback);
  }
}
