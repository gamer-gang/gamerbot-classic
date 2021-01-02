import { Message } from 'discord.js';

import { Command } from '..';
import { Context } from '../../types';

export class CommandPing implements Command {
  cmd = 'ping';
  docs = [
    {
      usage: 'ping',
      description: 'server to gateway roundtrip time',
    },
  ];

  async execute(context: Context): Promise<void | Message> {
    const { msg, startTime } = context;

    msg.channel.send('Pong!').then(ping => {
      const end = process.hrtime(startTime);
      ping.edit(`Pong! \`${Math.round((end[0] * 1e9 + end[1]) / 1e6)}ms\``);
    });
  }
}
