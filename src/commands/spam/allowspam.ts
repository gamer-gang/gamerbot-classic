import { Message } from 'discord.js';
import { Command } from '..';
import { CmdArgs } from '../../types';

export class CommandAllowSpam implements Command {
  cmd = 'allowspam';
  docs = {
    usage: 'allowspam <yes|y|true|no|n|false>',
    description: 'allow spam commands such as `lorem`, `spam`, and `random`',
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, configStore, args } = cmdArgs;
    const config = configStore.get(msg.guild?.id as string);

    if (!msg.guild?.member(msg.author?.id as string)?.hasPermission('ADMINISTRATOR')) {
      return msg.channel.send('missing `ADMINISTRATOR` permission');
    }

    if (args.length == 0) {
      msg.channel.send('yo i need an argument');
      return;
    }

    switch (args[0]) {
      case 'yes':
      case 'y':
      case 'true':
        config.allowSpam = true;
        break;
      case 'no':
      case 'n':
      case 'false':
        config.allowSpam = false;
        break;
    }

    configStore.set(msg.guild?.id as string, config);

    await msg.channel.send(`spam commands are now ${config.allowSpam ? 'allowed' : 'off'}`);
  }
}
