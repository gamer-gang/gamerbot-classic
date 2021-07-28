import { Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import { Command, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';

export class CommandSearch extends Command {
  cmd = ['lmgtfy', 'google'];
  docs = [
    {
      usage: 'lmgtfy <...query>',
      description: 'search the web',
    },
  ];
  commandOptions: CommandOptions = {
    description: 'When people bother you instead of googling',
    options: [
      {
        name: 'query',
        description: 'Search query',
        type: 'STRING',
        required: true,
      },
    ],
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    const query = event.isInteraction() ? event.options.getString('query') : event.args;
    if (!query) return event.reply(Embed.error('No search query provided').ephemeral());

    const encoded = query
      .split(' ')
      .map(word => encodeURIComponent(word))
      .join('+');
    event.reply(`https://lmgtfy.app/?q=${encoded}`);
  }
}
