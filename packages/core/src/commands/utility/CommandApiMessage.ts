import { codeBlock } from '@discordjs/builders';
import { Embed, parseDiscohookJSON } from '@gamerbot/util';
import { Message } from 'discord.js';
import { ChatCommand, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';

// eslint-disable-next-line no-useless-escape
// const urlRegExp = /^(https?|attachment):\/\/[a-z0-9\.\-\_]+\.[a-z0-9]+(\/[a-z0-9\/\.\-\_\$]+)?$/i;

export class CommandApiMessage extends ChatCommand {
  name = ['apimessage'];
  help = [
    {
      usage: 'apimessage <json data>',
      description: 'create a message from api data',
    },
  ];
  data: CommandOptions = {
    description: 'Create a message from API data',
    options: [
      {
        name: 'json',
        description: 'API JSON data',
        type: 'STRING',
        required: true,
      },
    ],
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    const json = event.isInteraction() ? event.options.getString('json', true) : event.args;

    try {
      event.reply(parseDiscohookJSON(json) as any);
    } catch (err) {
      event.reply(Embed.error(codeBlock(err)).ephemeral());
    }
  }
}
