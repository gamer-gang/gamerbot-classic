import { Message } from 'discord.js';
import yargsParser from 'yargs-parser';

import { Command } from '..';
import { Context } from '../../types';
import { Embed } from '../../util';

export class CommandEcho implements Command {
  cmd = 'echo';
  yargs: yargsParser.Options = {
    boolean: ['delete'],
    alias: {
      delete: 'd',
    },
    default: {
      delete: false,
    },
  };
  docs = [
    {
      usage: 'echo [-d, --delete] <...msg>',
      description: 'tells you what you just said (`-d` deletes source message)',
    },
  ];

  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;

    if (args._.length == 0 || /^\s+$/.test(args._.join(' ')))
      return msg.channel.send(Embed.error('**nothing to say**'));

    args.delete && msg.deletable && msg.delete();

    return msg.channel.send(args._.join(' '));
  }
}
