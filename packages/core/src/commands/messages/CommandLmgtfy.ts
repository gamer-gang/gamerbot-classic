import { Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import { ChatCommand, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';

export class CommandSearch extends ChatCommand {
  name = ['lmgtfy', 'google'];
  help = [
    {
      usage: 'lmgtfy <...query>',
      description: 'search the web',
    },
  ];
  data: CommandOptions = {
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
