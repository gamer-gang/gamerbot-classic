import { Message } from 'discord.js';
import { Command } from '.';
import { CmdArgs } from '../types';
import { hasMentions } from '../util';

let interval: NodeJS.Timeout | null;

export class CommandCowdos implements Command {
  cmd = 'cowdos';
  docs = {
    usage: 'cowdos <off|...cmd|>',
    description: 'spam text slowly',
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args } = cmdArgs;

    if (args.length == 0) {
      return msg.channel.send('args needed');
    }

    if (msg.author?.id !== process.env.OWNER_ID) {
      return msg.channel.send('owner only');
    }

    switch (args[0]) {
      case 'off': {
        if (!interval) return msg.channel.send('not running');
        clearInterval(interval);
        interval = null;
        msg.channel.send('off');
        break;
      }
      default: {
        if (interval) return msg.channel.send('already running');
        const command = args.join(' ');
        if (hasMentions(command, false)) return msg.channel.send('yea i aint doin that');
        interval = setInterval(() => {
          msg.channel.send(command);
        }, 1500);
        break;
      }
    }
  }
}
