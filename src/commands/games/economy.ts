import { Message } from 'discord.js';

import { Command } from '..';
import { EconomyManager } from '../../economy';
import { CmdArgs } from '../../types';
import { hasFlags } from '../../util';

export class CommandEconomy implements Command {
  cmd = ['economy', 'eco'];
  docs = [
    {
      usage: 'economy',
      description: 'get information about the economy and your account',
    },
    {
      usage: 'economy -j, --join',
      description: 'join the gamerbot economy',
    },
  ];
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, flags, args } = cmdArgs;

    if (hasFlags(flags, ['-j', '--join'])) {
      if (EconomyManager.isInEconomy(msg.author?.id as string))
        return msg.channel.send('already in economy');
      EconomyManager.addToEconomy(msg.author?.id as string);
      msg.channel.send(`welcome to the gamerbot economy`);
    }
  }
}
