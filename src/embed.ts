import { MessageEmbed, MessageEmbedOptions } from 'discord.js';

import { resolvePath } from './util';

export class Embed extends MessageEmbed {
  constructor(data?: MessageEmbed | MessageEmbedOptions) {
    super(data);
    this.setColor(0x1e90ff);
    this.attachFiles([resolvePath('assets/hexagon.png')]);
    this.setAuthor('gamerbot80', 'attachment://hexagon.png');
  }

  addBlankField(): void {
    this.addField('\u200b', '\u200b');
  }
}
