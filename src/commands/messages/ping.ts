import { Message } from 'discord.js';

import { Command } from '..';
import { CmdArgs } from '../../types';

export class CommandPing implements Command {
  cmd = 'ping';
  docs = [
    {
      usage: 'ping',
      description: 'server to gateway roundtrip time',
    },
  ];

  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args, startTime } = cmdArgs;

    msg.channel.send('Pong!').then(ping => {
      const end = process.hrtime(startTime);
      ping.edit(`Pong! \`${end[1] / 10 ** 6}ms\``);
    });
  }
}
