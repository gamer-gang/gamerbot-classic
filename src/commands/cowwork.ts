import { Message } from 'discord.js';
import { Command } from '.';
import { CmdArgs } from '../types';
import { hasMentions } from '../util';

let workInterval: NodeJS.Timeout | null;
let upgradeInterval: NodeJS.Timeout | null;
let running = false;

export class CommandCowwork implements Command {
  cmd = 'cowwork';
  docs = {
    usage: 'cowwork <start|stop>',
    description: 'work it good',
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args } = cmdArgs;

    if (args.length !== 1) {
      return msg.channel.send('expected 1 arg');
    }

    switch (args[0]) {
      case 'stop': {
        if (!running) return msg.channel.send('not running');
        clearInterval(workInterval!);
        clearInterval(upgradeInterval!);
        workInterval = null;
        upgradeInterval = null;
        running = false;
        msg.channel.send('stopped');
        break;
      }
      case 'start': {
        if (running) return msg.channel.send('already running');
        workInterval = setInterval(() => {
          msg.channel.send('/cow work');
        }, 1500);
        upgradeInterval = setInterval(() => {
          msg.channel.send('/cow bal');
        }, 120000);
        running = true;
        msg.channel.send('started');
        break;
      }
      default: {
        msg.channel.send('must be start or stop');
      }
    }
  }
}
