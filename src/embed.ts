import { MessageEmbed, MessageEmbedOptions } from 'discord.js';

import { resolvePath } from './util';

export class Embed extends MessageEmbed {
  constructor(data?: MessageEmbed | MessageEmbedOptions) {
    super(data);
    if (!this.color) this.setColor(0x1e90ff);
    if (!this.author) {
      this.setAuthor('gamerbot80', 'attachment://hexagon.png');
      this.attachFiles([resolvePath('assets/hexagon.png')]);
    }
  }

  addBlankField(): void {
    this.addField('\u200b', '\u200b');
  }
}
