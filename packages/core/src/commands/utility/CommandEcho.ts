import { Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import { Command, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';

export class CommandEcho extends Command {
  cmd = ['echo'];
  docs = [
    {
      usage: 'echo <...msg>',
      description: 'tells you what you just said (`-d` deletes source message)',
    },
  ];
  commandOptions: CommandOptions = {
    description: 'Tells you what you just said',
    options: [
      {
        name: 'message',
        description: 'a message to repeat',
        type: 'STRING',
        required: true,
      },
    ],
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    const input = event.isInteraction() ? event.options.getString('message') : event.args;
    if (!input) return event.reply(Embed.error('Nothing to say').ephemeral());

    return event.reply(input);
  }
}
