import { MessageEmbed, MessageEmbedOptions } from 'discord.js';
import { Colors } from '../constants';
import { getProfilePicture } from './message';

type EmbedIntent = 'info' | 'success' | 'warning' | 'error';

export interface EmbedOptions {
  noColor?: boolean;
  noAuthor?: boolean;
  intent?: EmbedIntent;
}

const intentEmojis = {
  error: '❌',
  warning: '⚠️',
  success: '✅',
};

const intentText = (message: string, desc?: string) =>
  message.match(/\*\*|```/)
    ? `${message}${desc ? `\n${desc}` : ''}`
    : `**${message}**${desc ? `\n${desc}` : ''}`;

export class Embed extends MessageEmbed {
  static error(message: string, description?: string): Embed {
    return new Embed({ intent: 'error', description: intentText(message, description) });
  }

  static warning(message: string, description?: string): Embed {
    return new Embed({ intent: 'warning', description: intentText(message, description) });
  }

  static success(message: string, description?: string): Embed {
    return new Embed({ intent: 'success', description: intentText(message, description) });
  }

  static info(message: string, description?: string): Embed {
    return new Embed({ intent: 'info', description: intentText(message, description) });
  }

  constructor(options?: (MessageEmbed | MessageEmbedOptions) & EmbedOptions) {
    super(options);

    if (!this.author && !options?.noAuthor) {
      if (options?.intent !== 'info' && options?.intent != null)
        this.setAuthor(`${intentEmojis[options?.intent]} ${options?.intent}`);
    }

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
  }

  setDefaultAuthor(): this {
    this.setAuthor('gamerbot80', 'attachment://hexagon.png');
    this.attachFiles([getProfilePicture()]);
    return this;
  }

  addBlankField(): this {
    this.addField('\u200b', '\u200b');
    return this;
  }
}
