import { Message } from 'discord.js';
import { Command, CommandDocs } from '..';
import { client } from '../../providers';
import { Context } from '../../types';
import { codeBlock, Embed } from '../../util';

export class CommandStop implements Command {
  cmd = 'stop';
  docs: CommandDocs = {
    usage: 'stop',
    description: 'stop playback',
  };
  async execute(context: Context): Promise<void | Message> {
    const { msg } = context;
    const queue = client.queues.get(msg.guild.id);

    if (!msg.guild.me?.voice) return msg.channel.send(Embed.error('Not conected to a channel'));

    if ((msg.guild.me?.voice?.channel?.members?.array().length ?? 2) > 1) {
      const userVoice = msg.member?.voice;
      if (!userVoice?.channel || userVoice.channel.id !== msg.guild.me.voice?.channel?.id)
        return msg.channel.send(Embed.error('You are not in the music channel'));
    }

    try {
      if (queue.voiceChannel?.members.size === 1) queue.tracks = [];
      queue.voiceConnection?.dispatcher?.end();
      msg.guild.me?.voice.kick();
      return msg.channel.send(Embed.success('Stopped'));
    } catch (err) {
      return msg.channel.send(Embed.error(codeBlock(err)));
    }
  }
}
