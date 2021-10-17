import { Embed } from '@gamerbot/util';
import { Message, TextChannel } from 'discord.js';
import { ChatCommand, CommandDocs, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';

export class CommandNowPlaying extends ChatCommand {
  name = ['nowplaying', 'playing', 'np'];
  help: CommandDocs = [
    {
      usage: 'nwplaying',
      description: 'show now playing embed',
    },
  ];
  data: CommandOptions = {
    description: 'Show currently playing track',
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    const queue = client.queues.get(event.guild.id);

    if (!(await queue.playing)) return event.reply(Embed.error('Not playing').ephemeral());

    queue.embed?.delete();
    delete queue.embed;

    queue.textChannel = event.channel as TextChannel;
    if (event.isInteraction()) event.reply(Embed.success('Moved now playing').ephemeral());
    queue.updateNowPlaying();
  }
}
