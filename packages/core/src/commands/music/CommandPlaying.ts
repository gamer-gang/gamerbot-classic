import { Embed } from '@gamerbot/util';
import { Message, TextChannel } from 'discord.js';
import { Command, CommandDocs, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';

export class CommandPlaying extends Command {
  cmd = ['playing', 'np'];
  docs: CommandDocs = [
    {
      usage: 'playing',
      description: 'show now playing embed',
    },
  ];
  commandOptions: CommandOptions = {
    description: 'Show currently playing track',
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    const queue = client.queues.get(event.guild.id);

    if (!queue.playing) return event.reply(Embed.error('not playing').ephemeral());

    queue.embed?.delete();
    delete queue.embed;

    queue.textChannel = event.channel as TextChannel;
    if (event.isInteraction()) event.reply(Embed.success('Moved now playing').ephemeral());
    queue.updateNowPlaying();
  }
}
