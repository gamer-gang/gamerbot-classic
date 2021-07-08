import { getVoiceConnection } from '@discordjs/voice';
import { Context } from '@gamerbot/types';
import { codeBlock, Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import { Command, CommandDocs } from '..';
import { client } from '../../providers';

export class CommandStop implements Command {
  cmd = ['stop', 'dc', 'disconnect'];
  docs: CommandDocs = {
    usage: 'stop',
    description: 'stop playback',
  };
  async execute(context: Context): Promise<void | Message> {
    const { msg } = context;
    const queue = client.queues.get(msg.guild.id);

    if (!msg.guild.me?.voice) return Embed.error('Not conected to a channel').reply(msg);

    if ((msg.guild.me?.voice?.channel?.members?.array().length ?? 2) > 1) {
      const userVoice = msg.member?.voice;
      if (!userVoice?.channel || userVoice.channel.id !== queue.voiceChannel?.id)
        return Embed.error('You are not in the music channel').reply(msg);
    }

    const connection = getVoiceConnection(msg.guild.id);

    try {
      queue.tracks = [];
      connection?.destroy();
      queue.audioPlayer.stop();
      return Embed.success('Stopped').reply(msg);
    } catch (err) {
      return Embed.error(codeBlock(err)).reply(msg);
    }
  }
}
