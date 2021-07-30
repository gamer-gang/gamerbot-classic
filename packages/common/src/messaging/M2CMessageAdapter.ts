import amqplib from 'amqplib';
import { Logger } from 'log4js';
import { EventEmitter } from 'stream';
import { amqp, assertAmqp, c2m, m2c } from './constants';
import { C2MEvents, M2CEvents } from './types';
import { makeMessage, parseMessage } from './utils';

export class M2CMessageAdapter extends EventEmitter {
  channel!: amqplib.Channel;

  constructor(private txLogger: Logger, private rxLogger: Logger) {
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
    this.channel.consume(c2m, msg => {
      if (!msg) return;

      const [id, guildId, command, ...args] = parseMessage(msg.content);
      this.rxLogger.trace(`c2m ${id} ${guildId} ${command} ${args.join(' ')}`);
      this.emit(command, id, guildId, ...args);
      this.channel.ack(msg);
    });
  }

  send<E extends keyof M2CEvents>(
    command: E,
    guildId: bigint | string,
    ...args: M2CEvents[E]
  ): bigint;
  send(command: string, guildId: bigint | string, ...args: string[]): bigint {
    const [id, buffer] = makeMessage(command, guildId, ...args);
    this.txLogger.trace(`m2c ${id} ${guildId} ${command} ${args.join(' ')} [${buffer.length}]`);
    this.channel.sendToQueue(m2c, buffer);
    return id;
  }

  on<E extends keyof C2MEvents>(
    event: E,
    callback: (id: bigint, guildId: bigint, ...args: C2MEvents[E]) => any
  ): this;
  on(event: string, callback: (...args: any[]) => any): this {
    return super.on(event, callback);
  }

  once<E extends keyof C2MEvents>(
    event: E,
    callback: (id: bigint, guildId: bigint, ...args: C2MEvents[E]) => any
  ): this;
  once(event: string, callback: (...args: any[]) => any): this {
    return super.once(event, callback);
  }

  off<E extends keyof C2MEvents>(
    event: E,
    callback: (id: bigint, guildId: bigint, ...args: C2MEvents[E]) => any
  ): this;
  off(event: string, callback: (...args: any[]) => any): this {
    return super.off(event, callback);
  }
}
