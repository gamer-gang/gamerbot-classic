import { Message } from 'discord.js';
import _ from 'lodash';
import { Command, CommandDocs } from '..';
import { client } from '../../providers';
import { Context } from '../../types';
import { codeBlock, Embed } from '../../util';

export class CommandShuffle implements Command {
  cmd = ['shuffle', 'shuf'];
  docs: CommandDocs = {
    usage: 'shuffle',
    description: 'shuffles queue',
  };
  async execute(context: Context): Promise<void | Message> {
    const { msg } = context;
    const queue = client.queues.get(msg.guild.id);

    if (!queue.playing) return msg.channel.send(Embed.error('not playing'));
    if (queue.tracks.length <= 1) return msg.channel.send(Embed.error('nothing in queue'));

    const voice = msg.member?.voice;
    if (!voice?.channel || voice.channel.id !== queue.voiceConnection?.channel.id)
      return msg.channel.send(Embed.error('you are not in the music channel'));

    try {
      const shuffled = _.shuffle(
        // omit currently playing track (which is going to moved to the top)
        _.clone(queue.tracks).filter((__, index) => index !== queue.current.index)
      );

      queue.tracks = [queue.tracks[queue.current.index], ...shuffled];
      queue.current.index = 0;

      return msg.channel.send(Embed.success('queue shuffled'));
    } catch (err) {
      return msg.channel.send(Embed.error(codeBlock(err)));
    }
  }
}
