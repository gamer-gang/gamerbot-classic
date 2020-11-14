import { Message } from 'discord.js';

import { Command, CommandDocs } from '..';
import { Context } from '../../types';
import { Embed, updatePlayingEmbed } from '../../util';

export class CommandPlaying implements Command {
  cmd = ['playing', 'np'];
  docs: CommandDocs = [
    {
      usage: 'playing',
      description: 'show now playing embed',
    },
  ];
  async execute(context: Context): Promise<void | Message> {
    const { msg, queueStore } = context;

    const queue = queueStore.get(msg.guild.id);

    if (!queue.playing) return msg.channel.send(Embed.error('not playing'));

    await updatePlayingEmbed({ guildId: msg.guild.id, playing: false });

    queue.current.embed = await msg.channel.send(Embed.info('loading...'));

    updatePlayingEmbed({ guildId: msg.guild.id, playing: true });
  }
}
