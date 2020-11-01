import { say } from 'cowsay';
import { Message } from 'discord.js';
import yargsParser from 'yargs-parser';

import { Command } from '..';
import { CmdArgs } from '../../types';
import { Embed } from '../../util';

export class CommandCowsay implements Command {
  cmd = 'cowsay';
  yargsSchema: yargsParser.Options = {
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
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args } = cmdArgs;

    if (args._.length == 0 || /^\s+$/.test(args._.join(' ')))
      return msg.channel.send(Embed.error('**nothing to say**'));

    args.delete && msg.deletable && msg.delete();

    return msg.channel.send(
      `\`\`\`\n${say({
        text: args._.join(' '),
        W: 48,
      })}\n\`\`\``
    );
  }
}
