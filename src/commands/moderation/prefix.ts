import { Message } from 'discord.js';

import { Command } from '..';
import { Config } from '../../entities/Config';
import { CmdArgs } from '../../types';
import { dbFindOneError } from '../../util';

const asciiRegExp = /^[ -~]+$/;

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

    if (args.length !== 1) return msg.channel.send('expected 1 arg');
    if (!asciiRegExp.test(args[0])) return msg.channel.send('only ascii characters allowed');
    if (args[0].length > 16) return msg.channel.send('too long');

    config.prefix = args[0];

    return msg.channel.send(`prefix is now ${config.prefix}`);
  }
}
