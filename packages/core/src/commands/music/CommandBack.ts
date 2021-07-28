import { codeBlock, Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import { Command, CommandDocs, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';

export class CommandPrevious extends Command {
  cmd = ['back', 'previous', 'prev'];
  docs: CommandDocs = [
    {
      usage: 'previous [number]',
      description: 'skip back one or more tracks',
    },
  ];
  commandOptions: CommandOptions = {
    description: 'Skip back in the queue',
    options: [
      {
        name: 'count',
        description: 'Number to skip back (default 1)',
        type: 'INTEGER',
      },
    ],
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

    const input = event.isInteraction()
      ? event.options.getInteger('count')
      : parseInt(event.argv[0]);

    try {
      if (input != null) {
        if (!input || isNaN(input) || input <= 0 || input > queue.tracks.length)
          return event.reply(Embed.error('Invalid amount').ephemeral());

        queue.index = (queue.index - input) % queue.tracks.length;

        event.reply(Embed.success(`Skipped back **${input}** track${input !== 1 ? 's' : ''}`));
      } else {
        queue.index -= 2;
        if (event.isMessage()) event.react('⏮️');
        else event.reply('Skipped back 1 track');
      }

      // break out of looping if looping one
      if (queue.loop === 'one') queue.index--;

      queue.audioPlayer.stop();
    } catch (err) {
      return event.reply(Embed.error(codeBlock(err)).ephemeral());
    }
  }
}
