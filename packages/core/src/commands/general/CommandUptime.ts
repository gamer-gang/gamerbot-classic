import { Embed, normalizeDuration } from '@gamerbot/util';
import { Message } from 'discord.js';
import { Duration } from 'luxon';
import { ChatCommand, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';

export class CommandUptime extends ChatCommand {
  name = ['uptime'];
  help = [
    {
      usage: 'uptime',
      description: 'check bot uptime',
    },
  ];
  data: CommandOptions = {
    description: 'Show instance uptime',
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    const uptime = normalizeDuration(
      Duration.fromObject({
        seconds: Math.round(process.uptime()),
      })
    );

    return event.reply(Embed.info('**Uptime:** ' + this.makeDurationString(uptime)));
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
