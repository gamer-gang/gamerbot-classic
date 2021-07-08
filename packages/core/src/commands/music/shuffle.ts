import { Context } from '@gamerbot/types';
import { codeBlock, Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import _ from 'lodash';
import { Command, CommandDocs } from '..';
import { client } from '../../providers';

export class CommandShuffle implements Command {
  cmd = ['shuffle', 'shuf'];
  docs: CommandDocs = {
    usage: 'shuffle',
    description: 'shuffle queue, moving current to top',
  };
  async execute(context: Context): Promise<void | Message> {
    const { msg } = context;
    const queue = client.queues.get(msg.guild.id);

    if (!queue.playing) return Embed.error('Not playing').reply(msg);
    if (queue.tracks.length <= 1) return Embed.error('Nothing in queue').reply(msg);

    const voice = msg.member?.voice;
    if (!voice?.channel || voice.channel.id !== queue.voiceChannel?.id)
      return Embed.error('You are not in the music channel').reply(msg);

    try {
      const shuffled = _.shuffle(
        // omit currently playing track (which is going to moved to the top)
        _.clone(queue.tracks).filter((__, index) => index !== queue.index)
      );

      queue.tracks = [queue.tracks[queue.index], ...shuffled];
      queue.index = 0;

      return Embed.success('Queue shuffled').reply(msg);
    } catch (err) {
      return Embed.error(codeBlock(err)).reply(msg);
    }
  }
}
