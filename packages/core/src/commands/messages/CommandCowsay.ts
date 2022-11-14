import { Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import { ChatCommand, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';

export class CommandCowsay extends ChatCommand {
  name = ['cowsay'];
  // yargs: yargsParser.Options = {
  //   boolean: ['delete', 'list'],
  //   string: ['cow'],
  //   alias: {
  //     delete: 'd',
  //     cow: 'f',
  //     list: 'l',
  //   },
  //   default: {
  //     delete: false,
  //   },
  // };

  help = [
    {
      usage: 'cowsay [-d, --delete] <...msg>',
      description: 'you know what it does (`--delete` deletes source command)',
    },
  ];
  data: CommandOptions = {
    description: 'Cow says stuff',
    options: [
      {
        name: 'text',
        description: 'Text to force the cow to say',
        type: 'STRING',
      },
    ],
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    return event.reply(Embed.error("No longer supported in v1. [Upgrade to v2](https://gamerbot.dev/invite) to use this command."));
  }
}
