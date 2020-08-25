import { MessageEmbed, MessageEmbedOptions } from 'discord.js';

export class Embed extends MessageEmbed {
  constructor(data?: MessageEmbed | MessageEmbedOptions) {
    super(data);
    this.setColor(0x1e90ff);
    this.attachFiles(['./assets/hexagon.png']);
    this.setAuthor('gamerbot80', 'attachment://hexagon.png');
  }
}
