import { Message } from 'discord.js';
import { Command, CommandDocs } from '..';
import { client } from '../../providers';
import { Context } from '../../types';
import { codeBlock, Embed } from '../../util';

export class CommandResume implements Command {
  cmd = 'resume';
  docs: CommandDocs = {
    usage: 'resume',
    description: 'resumes playback',
  };
  async execute(context: Context): Promise<void | Message> {
    const { msg } = context;
    const queue = client.queues.get(msg.guild.id);

    if (!queue.playing) return Embed.error('not playing').reply(msg);

    const voice = msg.member?.voice;
    if (!voice?.channel || voice.channel.id !== queue.voiceChannel?.id)
      return Embed.error('You are not in the music channel').reply(msg);

    try {
      queue.audioPlayer.unpause();
      queue.updateNowPlaying();
      msg.reply('▶️');
      return;
    } catch (err) {
      return Embed.error(codeBlock(err)).reply(msg);
    }
  }
}
