import { codeBlock, Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import { Command, CommandDocs, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';

export class CommandStop extends Command {
  cmd = ['stop', 'dc', 'disconnect'];
  docs: CommandDocs = [
    {
      usage: 'stop',
      description: 'stop playback',
    },
  ];
  commandOptions: CommandOptions = {
    description: 'Stops playback, disconnects, and resets queue',
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    const queue = client.queues.get(event.guild.id);

    if (!event.guild.me?.voice)
      return event.reply(Embed.error('Not conected to a channel').ephemeral());

    if ((event.guild.me?.voice?.channel?.members?.array().length ?? 2) > 1) {
      const userVoice = event.guild.members.cache.get(event.user.id)?.voice;
      if (!userVoice?.channel || userVoice.channel.id !== queue.voiceChannel?.id)
        return event.reply(
          Embed.error(
            'You must be in the same voice channel as the bot to use this command'
          ).ephemeral()
        );
    }

    try {
      queue.reset();
      if (event.isMessage()) event.react('⏹️');
      else event.reply(Embed.success('Stopped'));
    } catch (err) {
      return event.reply(Embed.error(codeBlock(err)).ephemeral());
    }
  }
}
