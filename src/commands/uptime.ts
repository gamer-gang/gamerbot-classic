import { Message } from 'discord.js';
import moment from 'moment';

import { Command } from '.';
import { CmdArgs } from '../types';

export class CommandUptime implements Command {
  cmd = 'uptime';
  docs = [
    {
      usage: 'uptime',
      description: 'check bot uptime',
    },
  ];

  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg } = cmdArgs;

    const uptime = moment.duration(Math.round(process.uptime()), 'seconds');

    msg.channel.send(`uptime: ${uptime.humanize()}`);
  }
}
