import { Embed } from '@gamerbot/util';
import { Connection, IDatabaseDriver, MikroORM } from '@mikro-orm/core';
import {
  CommandInteraction,
  EmojiIdentifierResolvable,
  Guild,
  InteractionDeferOptions,
  InteractionReplyOptions,
  Message,
  MessageComponentInteraction,
  MessagePayload,
  NewsChannel,
  Snowflake,
  TextChannel,
  ThreadChannel,
  User,
} from 'discord.js';
import { parse } from 'shell-quote';
import { Command } from '../commands';
import { Config } from '../entities/Config';
import { client } from '../providers';
import { CommandMessageOptionResolver, CommandOptionsParser } from './CommandMessageOptionResolver';

export type InitiatorType = 'message' | 'interaction';
export type NormalTextChannel = TextChannel | ThreadChannel | NewsChannel;
export type ReplyOptions = string | MessagePayload | InteractionReplyOptions | Embed;
export type APIMessage = Exclude<MessageComponentInteraction['message'], Message>;
export type DetailedMessage = Message & {
  guild: Guild;
  channel: TextChannel | NewsChannel | ThreadChannel;
};

export interface MessageContext {
  msg: DetailedMessage;
  args: string;
  cmd: string;
}

export interface InitiatorDetails {
  config: Config;
  startTime: [number, number];
  em: MikroORM<IDatabaseDriver<Connection>>['em'];
}

export type CommandEvent = MessageCommandEvent | InteractionCommandEvent;

export abstract class BaseCommandEvent {
  abstract type: InitiatorType;

  static from(
    initiator: MessageContext | CommandInteraction,
    details: InitiatorDetails
  ): CommandEvent {
    if (initiator instanceof CommandInteraction)
      return new InteractionCommandEvent(initiator, details);
    else return new MessageCommandEvent(initiator, details);
  }

  guildConfig: Config;
  startTime: [number, number];
  em: MikroORM<IDatabaseDriver<Connection>>['em'];

  constructor(details: InitiatorDetails) {
    this.guildConfig = details.config;
    this.startTime = details.startTime;
    this.em = details.em;
  }

  isMessage(): this is MessageCommandEvent {
    return this.type === 'message';
  }

  isInteraction(): this is InteractionCommandEvent {
    return this.type === 'interaction';
  }

  // abstract options: CommandInteraction['options'];
  abstract command: Command;
  abstract get member(): Exclude<CommandInteraction['member'], null>;
  abstract get user(): User;
  abstract get id(): Snowflake;
  abstract get commandName(): string;
  abstract get options(): CommandOptionsParser;
  abstract get guild(): Guild;
  abstract get channel(): NormalTextChannel;
  abstract get deferred(): boolean;
  abstract defer(options?: InteractionDeferOptions): Promise<void | Message | APIMessage>;
  abstract editReply(options: ReplyOptions): Promise<Message | APIMessage>;
  abstract deleteReply(): Promise<void>;
  abstract fetchReply(): Promise<Message | APIMessage>;
  abstract reply(options: ReplyOptions): Promise<void | Message>;
  abstract followUp(options: ReplyOptions): Promise<Message | APIMessage>;
}

class MessageCommandEvent extends BaseCommandEvent {
  type = 'message' as const;

  // options;
  command: Command;
  message: DetailedMessage;
  #initialReply?: Message;
  #commandName;
  args: string;
  argv: string[];
  options: CommandMessageOptionResolver;
  readonly valid: boolean;

  constructor({ msg, args, cmd }: MessageContext, details: InitiatorDetails) {
    super(details);

    this.message = msg;
    this.#commandName = cmd;
    this.args = args;

    const command = client.commands.find(v =>
      v.cmd.some(c => c.toLowerCase() === cmd.toLowerCase())
    );
    this.command = command as Command;
    this.valid = !!command;

    this.argv = parse(args).map(entry => {
      if (typeof entry === 'string') return entry;
      else if ((entry as any).pattern) return (entry as any).pattern as string;
      else if ((entry as any).op) return (entry as any).op as string;
      else return (entry as any).comment as string;
    });

    this.options = new CommandMessageOptionResolver(this.command, this.argv);
  }

  get member() {
    return this.message.member!;
  }
  get user() {
    return this.message.author;
  }
  get id() {
    return this.message.id;
  }
  get commandName() {
    return this.#commandName;
  }
  get guild() {
    return this.message.guild;
  }
  get channel() {
    return this.message.channel as NormalTextChannel;
  }
  get deferred() {
    return false;
  }

  defer() {
    return this.message.channel.sendTyping();
  }
  async editReply(options: ReplyOptions) {
    if (options instanceof Embed) {
      if (this.#initialReply) this.#initialReply = await options.edit(this.#initialReply);
      else this.#initialReply = await options.reply(this.message);
    } else {
      if (this.#initialReply) this.#initialReply = await this.#initialReply.edit(options);
      else this.#initialReply = await this.message.reply(options);
    }

    return this.#initialReply;
  }
  async deleteReply() {
    return void this.#initialReply?.delete();
  }
  async fetchReply() {
    if (!this.#initialReply) throw new Error('No initial reply to message');
    return this.#initialReply;
  }
  async reply(options: ReplyOptions): Promise<void> {
    if (!this.message.deleted) {
      if (options instanceof Embed) this.#initialReply = await options.reply(this.message);
      else this.#initialReply = await this.message.reply(options);
    } else {
      if (options instanceof Embed) this.#initialReply = await options.send(this.message.channel);
      else this.#initialReply = await this.message.channel.send(options);
    }
  }
  async followUp(options: ReplyOptions): ReturnType<CommandInteraction['followUp']> {
    if (!this.#initialReply) throw new Error('No initial reply to follow up on');
    return this.#initialReply.reply(options);
  }

  react(emoji: EmojiIdentifierResolvable) {
    return this.message.react(emoji);
  }
}

class InteractionCommandEvent extends BaseCommandEvent {
  type = 'interaction' as const;

  command: Command;

  constructor(public interaction: CommandInteraction, details: InitiatorDetails) {
    super(details);

    if (!this.interaction.guild) throw new Error('Interaction must have guild property');
    if (!this.interaction.channel || this.interaction.channel.type === 'DM')
      throw new Error('Interaction in a non-text or DM channel');

    const command = client.commands.find(v =>
      v.cmd.some(c => c.toLowerCase() === interaction.commandName)
    );
    if (!command) throw new Error('Could not find command class for interaction');

    this.command = command;
  }

  get member() {
    return this.interaction.member!;
  }
  get user() {
    return this.interaction.user;
  }
  get id() {
    return this.interaction.id;
  }
  get commandName() {
    return this.interaction.commandName;
  }
  get options() {
    return this.interaction.options;
  }
  get guild() {
    return this.interaction.guild!;
  }
  get channel() {
    return this.interaction.channel as NormalTextChannel;
  }
  get deferred() {
    return this.interaction.deferred;
  }

  defer(options?: InteractionDeferOptions & { fetchReply: true }): Promise<Message>;
  defer(options?: InteractionDeferOptions): Promise<void>;
  defer(options?: InteractionDeferOptions) {
    return this.interaction.defer(options) as Promise<void | Message>;
  }
  editReply(options: ReplyOptions): Promise<Message | APIMessage> {
    if (options instanceof Embed) return options.edit(this.interaction);
    else return this.interaction.editReply(options);
  }
  deleteReply() {
    return this.interaction.deleteReply();
  }
  fetchReply() {
    return this.interaction.fetchReply();
  }
  reply(options: ReplyOptions) {
    if (options instanceof Embed) return options.reply(this.interaction);
    else return this.interaction.reply(options);
  }
  followUp(options: ReplyOptions): Promise<Message | APIMessage> {
    if (options instanceof Embed) return options.followUp(this.interaction);
    else return this.interaction.followUp(options);
  }
}
