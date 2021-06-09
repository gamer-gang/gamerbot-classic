import { Message } from 'discord.js';
import { Command, CommandDocs } from '..';
import { client } from '../../providers';
import { Context } from '../../types';
import { codeBlock, Embed } from '../../util';

export class CommandPause implements Command {
  cmd = 'pause';
  docs: CommandDocs = {
    usage: 'pause',
    description: 'pauses playback',
  };
  async execute(context: Context): Promise<void | Message> {
    const { msg } = context;
    const queue = client.queues.get(msg.guild.id);

    if (!queue.playing) return msg.channel.send(Embed.error('not playing'));

    const voice = msg.member?.voice;
    if (!voice?.channel || voice.channel.id !== queue.voiceConnection?.channel.id)
      return msg.channel.send(Embed.error('you are not in the music channel'));

    try {
      queue.voiceConnection?.dispatcher?.pause(true);
      queue.paused = true;
      queue.updateNowPlaying();
    } catch (err) {
      return msg.channel.send(Embed.error(codeBlock(err)));
    }

    return msg.channel.send(Embed.success('paused'));
  }
}
