import { Message } from 'discord.js';
import { Command } from '..';
import { CmdArgs } from '../../types';

export class CommandBlackjack implements Command {
  cmd = 'blackjack';
  docs = {
    usage: 'blackjack [bid=5]',
    description: 'play blackjac',
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, configStore, args } = cmdArgs;
    const config = configStore.get(msg.guild?.id as string);

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

    configStore.set(msg.guild?.id as string, config);

    await msg.channel.send(`prefix is now ${config.prefix}`);
  }
}
