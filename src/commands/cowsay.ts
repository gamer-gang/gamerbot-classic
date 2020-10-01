import { say } from 'cowsay';
import { Message } from 'discord.js';

import { Command } from '.';
import { CmdArgs } from '../types';
import { hasFlags, spliceFlag } from '../util';

export class CommandCowsay implements Command {
  cmd = 'cowsay';
  docs = {
    usage: 'cowsay [-d] <...msg>',
    description: 'you know what it does (`-d` deletes source command)',
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args, flags } = cmdArgs;

    if (hasFlags(flags, ['-d'])) {
      spliceFlag(flags, args, '-d');
      msg.deletable && msg.delete();
    }

    if (args.length == 0 || /^\s+$/.test(args.join(' '))) return msg.channel.send('nothing to say');

    await msg.channel.send(
      `\`\`\`\n${say({
        text: args.join(' '),
        W: 48,
      })}\n\`\`\``
    );
  }
}
