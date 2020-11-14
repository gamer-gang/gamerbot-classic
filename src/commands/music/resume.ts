import { Message } from 'discord.js';

import { Command, CommandDocs } from '..';
import { Context } from '../../types';
import { codeBlock, Embed, updatePlayingEmbed } from '../../util';

export class CommandResume implements Command {
  cmd = 'resume';
  docs: CommandDocs = {
    usage: 'resume',
    description: 'resumes playback',
  };
  async execute(context: Context): Promise<void | Message> {
    const { msg, queueStore } = context;
    const queue = queueStore.get(msg.guild.id);

    if (!queue.playing) return msg.channel.send(Embed.error('not playing'));

    const voice = msg.member?.voice;
    if (!voice?.channel || voice.channel.id !== queue.voiceConnection?.channel.id)
      return msg.channel.send(Embed.error('you are not in the music channel'));

    try {
      queue.voiceConnection?.dispatcher.resume();
      updatePlayingEmbed({ guildId: msg.guild.id, playing: true });
      return msg.channel.send(Embed.success('resumed'));
    } catch (err) {
      return msg.channel.send(Embed.error(codeBlock(err)));
    }
  }
}
