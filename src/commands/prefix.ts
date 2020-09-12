import { Message } from 'discord.js';

import { Command } from '.';
import { Config } from '../entities/Config';
import { CmdArgs } from '../types';
import { dbFindOneError } from '../util';

export class CommandPrefix implements Command {
  cmd = 'prefix';
  docs = {
    usage: 'prefix <newPrefix>',
    description: 'set the prefix',
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, em, args } = cmdArgs;

    const config = await em.findOneOrFail(
      Config,
      { guildId: msg.guild?.id as string },
      { failHandler: dbFindOneError(msg.channel) }
    );

    if (args.length == 0) {
      msg.channel.send('argument needed');
      return;
    } else if (args.length > 1) {
      msg.channel.send('too many arguments');
      return;
    }

    const asciiRegExp = /^[ -~]+$/;

    if (!asciiRegExp.test(args[0])) {
      msg.channel.send('only ascii characters allowed');
      return;
    }

    if (args[0].length > 30) {
      msg.channel.send('too long');
      return;
    }

    if (args[0].length) config.prefix = args[0];

    await msg.channel.send(`prefix is now ${config.prefix}`);
  }
}
