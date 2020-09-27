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

    msg.channel.send(`uptime: ${this.makeDurationString(uptime)}`);
  }

  makeDurationString(duration: moment.Duration): string {
    const years = duration.years();
    const months = duration.months();
    const days = duration.days();
    const hours = duration.hours();
    const minutes = duration.minutes();
    const seconds = duration.seconds();

    const segments = [
      years && `${years} year${years > 1 ? 's' : ''}`,
      months && `${months} month${months > 1 ? 's' : ''}`,
      days && `${days} day${days > 1 ? 's' : ''}`,
      hours && `${hours} hour${hours > 1 ? 's' : ''}`,
      minutes && `${minutes} minute${minutes > 1 ? 's' : ''}`,
      seconds && `${seconds} second${seconds > 1 ? 's' : ''}`,
    ];
    return segments.filter(v => !!v).join(', ');
  }
}
