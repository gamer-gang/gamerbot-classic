import { say } from 'cowsay2';
import { Message } from 'discord.js';
import yargsParser from 'yargs-parser';

import { Command } from '..';
import { Context } from '../../types';
import { codeBlock, Embed } from '../../util';

export class CommandCowsay implements Command {
  cmd = 'cowsay';
  yargs: yargsParser.Options = {
    boolean: ['delete'],
    alias: {
      delete: 'd',
    },
    default: {
      delete: false,
    },
  };
  docs = {
    usage: 'cowsay [-d, --delete] <...msg>',
    description: 'you know what it does (`--delete` deletes source command)',
  };
  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;

    if (args._.length == 0 || /^\s+$/.test(args._.join(' ')))
      return msg.channel.send(Embed.error('nothing to say'));

    args.delete && msg.deletable && msg.delete();

    return msg.channel.send(
      codeBlock(
        say(args._.join(' '), {
          W: 48,
        })
      )
    );
  }
}
