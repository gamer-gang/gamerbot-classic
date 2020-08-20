import { Message } from 'discord.js';
import { Command } from '.';
import { CmdArgs } from '../types';

export class CommandPrefix implements Command {
  cmd = 'prefix';
  docs = {
    usage: 'prefix <newPrefix>',
    description: 'set the prefix',
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, configStore, args } = cmdArgs;
    const config = configStore.get(msg.guild?.id as string);

    if (args.length == 0) {
      msg.channel.send('yo i need an argument');
      return;
    }
    config.prefix = args[0];

    configStore.set(msg.guild?.id as string, config);

    await msg.channel.send(`prefix is now ${config.prefix}`);
  }
}
