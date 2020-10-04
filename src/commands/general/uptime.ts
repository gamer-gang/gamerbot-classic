import { Message } from 'discord.js';
import moment from 'moment';

import { Command } from '..';
import { CmdArgs } from '../../types';

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

    return msg.channel.send(`uptime: ${this.makeDurationString(uptime)}`);
  }

  makeDurationString(duration: moment.Duration): string {
    const units = ['years', 'months', 'days', 'hours', 'minutes', 'seconds'] as const;

    const segments = units.map(unit => {
      const count = duration[unit]();
      return count && `${count} ${unit.replace(/s$/, '')}${count > 1 ? 's' : ''}`;
    });

    return segments.filter(v => !!v).join(', ');
  }
}
