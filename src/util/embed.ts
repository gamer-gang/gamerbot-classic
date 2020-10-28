import { MessageEmbed, MessageEmbedOptions } from 'discord.js';

import { resolvePath } from './path';

type EmbedIntent = 'info' | 'success' | 'warning' | 'error';

export interface EmbedOptions {
  noColor?: boolean;
  noAuthor?: boolean;
  intent?: EmbedIntent;
}

const intentEmojis: Record<EmbedIntent, string> = {
  error: '❌',
  warning: '⚠️',
  success: '✅',
  info: '', // not wanted
};

export class Embed extends MessageEmbed {
  constructor(options?: (MessageEmbed | MessageEmbedOptions) & EmbedOptions) {
    super(options);

    if (!this.author && !options?.noAuthor) {
      if (options?.intent !== 'info' && options?.intent != null)
        this.setAuthor(`${intentEmojis[options?.intent as EmbedIntent]} ${options?.intent}`);
    }

    if (!this.color && !options?.noColor) {
      switch (options?.intent) {
        case 'error':
          this.setColor(0xff1e20);
          break;
        case 'warning':
          this.setColor(0xff8d1e);
          break;
        case 'success':
          this.setColor(0x58ff1e);
          break;
        case 'info':
        default:
          this.setColor(0x1e90ff);
      }
    }
  }

  setDefaultAuthor(): this {
    this.setAuthor('gamerbot80', 'attachment://hexagon.png');
    this.attachFiles([resolvePath('assets/hexagon.png')]);
    return this;
  }

  addBlankField(): this {
    this.addField('\u200b', '\u200b');
    return this;
  }
}
