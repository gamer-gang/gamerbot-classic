import { Message } from 'discord.js';
import _ from 'lodash';

import { Command, CommandDocs } from '..';
import { Context, Track } from '../../types';
import { codeBlock, Embed } from '../../util';

export class CommandStop implements Command {
  cmd = 'stop';
  docs: CommandDocs = {
    usage: 'stop',
    description: 'stops playback',
  };
  async execute(context: Context): Promise<void | Message> {
    const { msg, queueStore } = context;
    const queue = queueStore.get(msg.guild.id);

    if (!queue.playing) return msg.channel.send(Embed.error('not playing'));

    const voice = msg.member?.voice;
    if (!voice?.channel || voice.channel.id !== queue.voiceConnection?.channel.id)
      return msg.channel.send(Embed.error('you are not in the voice channel'));

    try {
      queue.tracks = [_.head(queue.tracks) as Track];
      queue.voiceConnection?.dispatcher?.end('stop command');
      return msg.channel.send(Embed.success('stopped'));
    } catch (err) {
      return msg.channel.send(Embed.error(codeBlock(err)));
    }
  }
}
