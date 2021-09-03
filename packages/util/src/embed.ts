import {
  CommandInteraction,
  DMChannel,
  FileOptions,
  GuildEmoji,
  InteractionReplyOptions,
  Message,
  MessageComponentInteraction,
  MessageEmbed,
  MessageEmbedOptions,
  MessageOptions,
  MessagePayload,
  NewsChannel,
  PartialMessage,
  ReplyMessageOptions,
  TextChannel,
  ThreadChannel,
} from 'discord.js';
import _ from 'lodash/fp';
import { Color } from './color';
import { getProfilePicture } from './message';
import { getClient } from './_client';

type APIMessage = Exclude<MessageComponentInteraction['message'], Message>;

type EmbedIntent = 'info' | 'success' | 'warning' | 'error';

export class Colors {
  static readonly green = Color.from(0x8eef43);
  static readonly blue = Color.from(0x209fd5);
  static readonly red = Color.from(0xfb4b4e);
  static readonly orange = Color.from(0xefa443);
}

export interface EmbedOptions {
  noColor?: boolean;
  noAuthor?: boolean;
  intent?: EmbedIntent;
}

const intentText = (message: string, desc?: string) =>
  message.match(/\*\*|```|`.+`/)
    ? `${message}${desc ? `\n\n${desc}` : ''}`
    : `**${message}**${desc ? `\n\n${desc}` : ''}`;

const spacer = '  \u2002';

const customEmojis: { [key: string]: GuildEmoji | false } = {};

export class Embed extends MessageEmbed {
  static error(message: string, description?: string): Embed {
    const client = getClient();
    customEmojis.error ??= client.getCustomEmoji('error') ?? false;
    return new Embed({
      intent: 'error',
      description: `${customEmojis.error || '❌'}${spacer}${intentText(message, description)}`,
    });
  }

  static warning(message: string, description?: string): Embed {
    const client = getClient();
    customEmojis.warning ??= client.getCustomEmoji('warn') ?? false;
    return new Embed({
      intent: 'warning',
      description: `${customEmojis.warning || '⚠️'}${spacer}${intentText(message, description)}`,
    });
  }

  static success(message: string, description?: string): Embed {
    const client = getClient();
    customEmojis.success ??= client.getCustomEmoji('success') ?? false;
    return new Embed({
      intent: 'success',
      description: `${customEmojis.success || '✅'}${spacer}${intentText(message, description)}`,
    });
  }

  static info(message: string, description?: string): Embed {
    return new Embed({ intent: 'info', description: intentText(message, description) });
  }

  files: FileOptions[] = [];
  #ephemeral = false;

  constructor(options?: (MessageEmbed | MessageEmbedOptions) & EmbedOptions) {
    super(options);

    if (!this.color && !options?.noColor) {
      switch (options?.intent) {
        case 'error':
          this.setColor(Colors.red.number);
          break;
        case 'warning':
          this.setColor(Colors.orange.number);
          break;
        case 'success':
          this.setColor(Colors.green.number);
          break;
        case 'info':
        default:
          this.setColor(Colors.blue.number);
      }
    }

    // super.setFooter(
    //   'gamerbot',
    //   'https://raw.githubusercontent.com/gamer-gang/gamerbot/master/assets/hexagon.png'
    // );
  }

  setDefaultAuthor(): this {
    const client = getClient();
    this.setAuthor('gamerbot', 'attachment://hexagon.png');
    this.attachFiles(getProfilePicture(client));
    return this;
  }

  ephemeral(ephemeral = true): this {
    this.#ephemeral = ephemeral;
    return this;
  }

  // setFooter(text: unknown): this {
  //   super.setFooter(
  //     'gamerbot  •  ' + text,
  //     'https://raw.githubusercontent.com/gamer-gang/gamerbot/master/assets/hexagon.png'
  //   );
  //   return this;
  // }

  addBlankField(): this {
    this.addField('\u200b', '\u200b');
    return this;
  }

  attachFiles(...files: FileOptions[]): this {
    this.files.push(...files);
    return this;
  }

  send(
    channel: TextChannel | ThreadChannel | NewsChannel | DMChannel,
    options: MessagePayload | MessageOptions = {}
  ): Promise<Message> {
    return channel.send(_.merge({ embeds: [this], files: this.files }, options));
  }

  reply(
    message: Message | PartialMessage | CommandInteraction,
    options?: MessagePayload | ReplyMessageOptions
  ): Promise<Message>;
  reply(interaction: CommandInteraction, options?: InteractionReplyOptions): Promise<void>;
  reply(
    message: Message | PartialMessage | CommandInteraction,
    options: MessagePayload | ReplyMessageOptions | InteractionReplyOptions = {}
  ): Promise<Message | void> {
    if (message instanceof CommandInteraction)
      return message.reply(
        _.merge({ embeds: [this], files: this.files, ephemeral: this.#ephemeral }, options)
      );
    else return message.reply(_.merge({ embeds: [this], files: this.files }, options));
  }

  edit(
    message: Message | PartialMessage | CommandInteraction,
    options?: MessagePayload | ReplyMessageOptions
  ): Promise<Message>;
  edit(
    interaction: CommandInteraction,
    options?: InteractionReplyOptions
  ): Promise<Message | APIMessage>;
  edit(
    message: Message | PartialMessage | CommandInteraction,
    options: MessagePayload | ReplyMessageOptions | InteractionReplyOptions = {}
  ): Promise<Message | APIMessage | void> {
    if (message instanceof CommandInteraction)
      return message.editReply(
        _.merge({ embeds: [this], files: this.files, ephemeral: this.#ephemeral }, options)
      );
    else return message.reply(_.merge({ embeds: [this], files: this.files }, options));
  }

  followUp(
    interaction: CommandInteraction,
    options?: InteractionReplyOptions
  ): Promise<Message | APIMessage> {
    return interaction.followUp(
      _.merge({ embeds: [this], files: this.files, ephemeral: this.#ephemeral }, options)
    );
  }
}
