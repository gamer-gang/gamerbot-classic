import { Message } from 'discord.js';

import { Command } from '..';
import { Config } from '../../entities/Config';
import { CmdArgs } from '../../types';
import { dbFindOneError } from '../../util';

export class CommandEgg implements Command {
  cmd = 'egg';
  docs = [
    {
      usage: 'egg',
      description: 'egg',
    },
  ];

  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, em } = cmdArgs;

    const config = await em.findOneOrFail(
      Config,
      { guildId: msg.guild?.id as string },
      { failHandler: dbFindOneError(msg.channel) }
    );

    if (!msg.guild?.member(msg.author?.id as string)?.hasPermission('ADMINISTRATOR')) {
      return msg.channel.send('missing `ADMINISTRATOR` permission');
    }

    config.egg = !config.egg;

    await msg.channel.send(`egg ${config.egg ? 'activated' : 'off (but why???)'}`);
  }
}
