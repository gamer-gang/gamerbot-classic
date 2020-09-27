import { Message } from 'discord.js';

import { Command } from '.';
import { CmdArgs } from '../types';
import { hasFlags, spliceFlag } from '../util';

export class CommandEcho implements Command {
  cmd = 'echo';
  docs = [
    {
      usage: 'echo [-d] <...msg>',
      description: 'tells you what you just said (`-d` deletes source message)',
    },
  ];

  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args, flags } = cmdArgs;

    if (hasFlags(flags, ['-d'])) {
      spliceFlag(flags, args, '-d');
      msg.deletable && msg.delete();
    }

    msg.channel.send(args.join(' '));
  }
}
