import { Embed, parseQuotes } from '@gamerbot/util';
import { Connection, IDatabaseDriver, MikroORM } from '@mikro-orm/core';
import {
  CommandInteraction,
  ContextMenuInteraction,
  EmojiIdentifierResolvable,
  Guild,
  InteractionDeferReplyOptions,
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
import { ChatCommand, MessageCommand, UserCommand } from '../commands';
import { Config } from '../entities/Config';
import { client } from '../providers';

export type InitiatorType = 'message' | 'interaction' | 'context-menu';
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

export type CommandEvent = MessageCommandEvent | InteractionCommandEvent | ContextMenuCommandEvent;

export abstract class BaseCommandEvent {
  abstract type: InitiatorType;

  static from(initiator: MessageContext, details: InitiatorDetails): MessageCommandEvent;
  static from(
    initiator: ContextMenuInteraction,
    details: InitiatorDetails
  ): ContextMenuCommandEvent;
  static from(initiator: CommandInteraction, details: InitiatorDetails): InteractionCommandEvent;
  static from(
    initiator: MessageContext | CommandInteraction | ContextMenuInteraction,
    details: InitiatorDetails
  ): CommandEvent {
    if (initiator instanceof ContextMenuInteraction)
      return new ContextMenuCommandEvent(initiator, details);
    else if (initiator instanceof CommandInteraction)
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

  isInteraction(): this is InteractionCommandEvent | ContextMenuCommandEvent {
    return this.type === 'interaction' || this.type === 'context-menu';
  }

  isContextMenuInteraction(): this is ContextMenuCommandEvent {
    return this.type === 'context-menu';
  }

  // abstract options: CommandInteraction['options'];
  abstract command: ChatCommand | MessageCommand | UserCommand;
  abstract get member(): Exclude<CommandInteraction['member'], null>;
  abstract get user(): User;
  abstract get id(): Snowflake;
  abstract get commandName(): string;
  abstract get guild(): Guild;
  abstract get channel(): NormalTextChannel;
  abstract get deferred(): boolean;
  abstract deferReply(options?: InteractionDeferReplyOptions): Promise<void | Message | APIMessage>;
  abstract editReply(options: ReplyOptions): Promise<Message | APIMessage>;
  abstract deleteReply(): Promise<void>;
  abstract fetchReply(): Promise<Message | APIMessage>;
  abstract reply(options: ReplyOptions): Promise<void | Message>;
  abstract followUp(options: ReplyOptions): Promise<Message | APIMessage>;
}

class MessageCommandEvent extends BaseCommandEvent {
  type = 'message' as const;

  // options;
  command: ChatCommand;
  message: DetailedMessage;
  #initialReply?: Message;
  #commandName;
  args: string;
  argv: string[];
  readonly valid: boolean;

  constructor({ msg, args, cmd }: MessageContext, details: InitiatorDetails) {
    super(details);

    this.message = msg;
    this.#commandName = cmd;
    this.args = args;

    const command = client.commands.find(
      command =>
        command.type === 'CHAT_INPUT' &&
        command.name.some(c => c.toLowerCase() === cmd.toLowerCase())
    );
    this.command = command as ChatCommand;
    this.valid = !!command;

    this.argv = parseQuotes(args);
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

  deferReply() {
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

abstract class BaseInteractionCommandEvent extends BaseCommandEvent {
  type = 'interaction' as const;

  constructor(
    public interaction: CommandInteraction | ContextMenuInteraction,
    details: InitiatorDetails
  ) {
    super(details);

    if (!this.interaction.guild) throw new Error('Interaction must have guild property');
    if (!this.interaction.channel || this.interaction.channel.type === 'DM')
      throw new Error('Interaction in a non-text or DM channel');

    const command = client.commands.find(command =>
      (Array.isArray(command.name) ? command.name : [command.name]).some(
        c => c.toLowerCase() === interaction.commandName.toLowerCase()
      )
    );

    if (!command) throw new Error('Could not find command class for interaction');

    // cannot happen
    if (command.type !== 'CHAT_INPUT' && command.type !== 'MESSAGE') throw new Error();

    // @ts-ignore expected behavior
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

  deferReply(options?: InteractionDeferReplyOptions & { fetchReply: true }): Promise<Message>;
  deferReply(options?: InteractionDeferReplyOptions): Promise<void>;
  deferReply(options?: InteractionDeferReplyOptions) {
    return this.interaction.deferReply(options) as Promise<void | Message>;
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

class InteractionCommandEvent extends BaseInteractionCommandEvent {
  type = 'interaction' as const;

  command: ChatCommand;

  constructor(
    public interaction: CommandInteraction | ContextMenuInteraction,
    details: InitiatorDetails
  ) {
    super(interaction, details);

    if (!this.interaction.guild) throw new Error('Interaction must have guild property');
    if (!this.interaction.channel || this.interaction.channel.type === 'DM')
      throw new Error('Interaction in a non-text or DM channel');

    const command = client.commands.find(command =>
      (Array.isArray(command.name) ? command.name : [command.name]).some(
        c => c.toLowerCase() === interaction.commandName.toLowerCase()
      )
    );

    if (!command) throw new Error('Could not find command class for interaction');

    // cannot happen
    if (command.type !== 'CHAT_INPUT' && command.type !== 'MESSAGE') throw new Error();

    // @ts-ignore expected behavior
    this.command = command;
  }
}

export class ContextMenuCommandEvent extends BaseInteractionCommandEvent {
  // @ts-ignore expected behavior
  command!: UserCommand | MessageCommand;
  interaction!: ContextMenuInteraction;

  constructor(interaction: ContextMenuInteraction, details: InitiatorDetails) {
    super(interaction, details);
  }

  get targetType(): ContextMenuInteraction['targetType'] {
    return this.interaction.targetType;
  }

  get targetId(): Snowflake {
    return this.interaction.targetId;
  }
}
