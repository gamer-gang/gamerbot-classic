import { codeBlock, Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import { ChatCommand, CommandDocs, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';

export class CommandNext extends ChatCommand {
  name = ['skip', 'next'];
  help: CommandDocs = [
    {
      usage: 'skip [number]',
      description: 'skip one or more tracks',
    },
  ];
  data: CommandOptions = {
    description: 'Skip forward in the queue',
    options: [
      {
        name: 'count',
        description: 'Number to skip (default 1)',
        type: 'INTEGER',
      },
    ],
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    const queue = client.queues.get(event.guild.id);

    if (!(await queue.playing)) return event.reply(Embed.error('Not playing').ephemeral());

    const voice = event.guild.members.cache.get(event.user.id)?.voice;
    if (!voice?.channel || voice.channel.id !== queue.voiceChannel?.id)
      return event.reply(
        Embed.error(
          'You must be in the same voice channel as the bot to use this command'
        ).ephemeral()
      );

    const input =
      (event.isInteraction() ? event.options.getInteger('count') : parseInt(event.argv[0])) ?? 1;

    try {
      if (input != undefined) {
        if (!input || isNaN(input) || input <= 0 || input >= queue.tracks.length)
          return event.reply(Embed.error('Invalid skip amount').ephemeral());

        queue.index = (queue.index + input - 1) % queue.tracks.length;

        event.reply(Embed.success(`Skipped **${input}** tracks`));
      } else {
        if (event.isMessage()) event.react('⏸⏭️');
        else event.reply(Embed.success('Skipped 1 track'));
      }

      // break out of looping if looping one
      if (queue.loop === 'one') queue.index++;

      queue.adapter.send('end');
    } catch (err) {
      return event.reply(Embed.error(codeBlock(err)).ephemeral());
    }
  }
}
