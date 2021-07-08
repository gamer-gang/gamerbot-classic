import { Context } from '@gamerbot/types';
import { Embed } from '@gamerbot/util';
import { Message, TextChannel } from 'discord.js';
import { Command, CommandDocs } from '..';
import { client } from '../../providers';

export class CommandPlaying implements Command {
  cmd = ['playing', 'np'];
  docs: CommandDocs = [
    {
      usage: 'playing',
      description: 'show now playing embed',
    },
  ];
  async execute(context: Context): Promise<void | Message> {
    const { msg } = context;

    const queue = client.queues.get(msg.guild.id);

    if (!queue.playing) return Embed.error('not playing').reply(msg);

    queue.embed?.delete();
    delete queue.embed;

    queue.textChannel = msg.channel as TextChannel;
    queue.updateNowPlaying();
  }
}
