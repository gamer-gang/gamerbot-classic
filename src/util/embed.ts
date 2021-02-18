import { GuildEmoji, MessageEmbed, MessageEmbedOptions } from 'discord.js';
import { client } from '../providers';
import { color } from './color';
import { getProfilePicture } from './message';

type EmbedIntent = 'info' | 'success' | 'warning' | 'error';

export class Colors {
  static readonly green = color(0x8eef43);
  static readonly blue = color(0x209fd5);
  static readonly red = color(0xfb4b4e);
  static readonly orange = color(0xefa443);
}

export interface EmbedOptions {
  noColor?: boolean;
  noAuthor?: boolean;
  intent?: EmbedIntent;
}

const intentText = (message: string, desc?: string) =>
  message.match(/\*\*|```/)
    ? `${message}${desc ? `\n\n${desc}` : ''}`
    : `**${message}**${desc ? `\n\n${desc}` : ''}`;

const spacer = '  \u2002';

const customEmojis: { [key: string]: GuildEmoji | false } = {};

export class Embed extends MessageEmbed {
  static error(message: string, description?: string): Embed {
    customEmojis.error ??= client.getCustomEmoji('error') ?? false;
    return new Embed({
      intent: 'error',
      description: `${customEmojis.error || '❌'}${spacer}${intentText(message, description)}`,
    });
  }

  static warning(message: string, description?: string): Embed {
    customEmojis.warning ??= client.getCustomEmoji('warn') ?? false;
    return new Embed({
      intent: 'warning',
      description: `${customEmojis.warning || '⚠️'}${spacer}${intentText(message, description)}`,
    });
  }

  static success(message: string, description?: string): Embed {
    customEmojis.success ??= client.getCustomEmoji('success') ?? false;
    return new Embed({
      intent: 'success',
      description: `${customEmojis.success || '✅'}${spacer}${intentText(message, description)}`,
    });
  }

  static info(message: string, description?: string): Embed {
    return new Embed({ intent: 'info', description: intentText(message, description) });
  }

  constructor(options?: (MessageEmbed | MessageEmbedOptions) & EmbedOptions) {
    super(options);

    if (!this.color && !options?.noColor) {
      switch (options?.intent) {
        case 'error':
          this.setColor(Colors.red());
          break;
        case 'warning':
          this.setColor(Colors.orange());
          break;
        case 'success':
          this.setColor(Colors.green());
          break;
        case 'info':
        default:
          this.setColor(Colors.blue());
      }
    }

    // super.setFooter(
    //   'gamerbot',
    //   'https://raw.githubusercontent.com/gamer-gang/gamerbot/master/assets/hexagon.png'
    // );
  }

  setDefaultAuthor(): this {
    this.setAuthor('gamerbot80', 'attachment://hexagon.png');
    this.attachFiles([getProfilePicture()]);
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
}
