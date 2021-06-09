import { Message } from 'discord.js';
import { Duration } from 'luxon';
import { Command } from '..';
import { Context } from '../../types';
import { Embed, normalizeDuration } from '../../util';

export class CommandUptime implements Command {
  cmd = 'uptime';
  docs = [
    {
      usage: 'uptime',
      description: 'check bot uptime',
    },
  ];

  async execute(context: Context): Promise<void | Message> {
    const { msg } = context;

    const uptime = normalizeDuration(
      Duration.fromObject({
        seconds: Math.round(process.uptime()),
      })
    );

    return msg.channel.send(Embed.info('**uptime:** ' + this.makeDurationString(uptime)));
  }

  makeDurationString(duration: Duration): string {
    const obj = duration.normalize().toObject();

    const units = ['years', 'months', 'days', 'hours', 'minutes', 'seconds'] as const;

    const segments = units.map(unit => {
      const count = obj[unit];
      return count && `${count} ${unit.replace(/s$/, '')}${count > 1 ? 's' : ''}`;
    });

    return segments.filter(v => !!v).join(', ');
  }
}
