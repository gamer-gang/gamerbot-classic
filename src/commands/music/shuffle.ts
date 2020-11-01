import { Message } from 'discord.js';
import _ from 'lodash';

import { Command, CommandDocs } from '..';
import { CmdArgs } from '../../types';
import { codeBlock, Embed } from '../../util';

export class CommandShuffle implements Command {
  cmd = ['shuffle', 'shuf'];
  docs: CommandDocs = {
    usage: 'shuffle',
    description: 'shuffles queue',
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, queueStore } = cmdArgs;
    const queue = queueStore.get(msg.guild.id);

    if (!queue.playing) return msg.channel.send(Embed.error('not playing'));
    if (queue.tracks.length <= 1) return msg.channel.send(Embed.error('nothing in queue'));

    const voice = msg.member?.voice;
    if (!voice?.channel || voice.channel.id !== queue.voiceConnection?.channel.id)
      return msg.channel.send(Embed.error('you are not in the music channel'));

    try {
      queue.tracks = [queue.tracks[0], ..._.shuffle(queue.tracks.slice(1))];
      return msg.channel.send(Embed.success('queue shuffled'));
    } catch (err) {
      return msg.channel.send(Embed.error(codeBlock(err)));
    }
  }
}
