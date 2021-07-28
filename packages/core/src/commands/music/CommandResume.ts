import { codeBlock, Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import { Command, CommandDocs, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';

export class CommandResume extends Command {
  cmd = ['resume'];
  docs: CommandDocs = [
    {
      usage: 'resume',
      description: 'resumes playback',
    },
  ];
  commandOptions: CommandOptions = {
    description: 'Resume playback',
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    const queue = client.queues.get(event.guild.id);

    if (!queue.playing) return event.reply(Embed.error('Not playing').ephemeral());

    const voice = event.guild.members.cache.get(event.user.id)?.voice;
    if (!voice?.channel || voice.channel.id !== queue.voiceChannel?.id)
      return event.reply(
        Embed.error(
          'You must be in the same voice channel as the bot to use this command'
        ).ephemeral()
      );

    try {
      queue.audioPlayer.unpause();
      queue.updateNowPlaying();
      if (event.isMessage()) event.react('▶️');
      else event.reply(Embed.success('Playback resumed'));
      return;
    } catch (err) {
      return event.reply(Embed.error(codeBlock(err)).ephemeral());
    }
  }
}
