import { MessageEmbed, MessageEmbedOptions } from 'discord.js';

import { resolvePath } from '../util';

export interface EmbedOptions {
  noAuthor?: boolean;
  noColor?: boolean;
}

export class Embed extends MessageEmbed {
  constructor(options?: (MessageEmbed | MessageEmbedOptions) & EmbedOptions) {
    super(options);
    if (!this.color && !options?.noColor) this.setColor(0x1e90ff);
    if (!this.author && !options?.noAuthor) {
      this.setAuthor('gamerbot80', 'attachment://hexagon.png');
      this.attachFiles([resolvePath('assets/hexagon.png')]);
    }
  }

  addBlankField(): void {
    this.addField('\u200b', '\u200b');
  }
}
