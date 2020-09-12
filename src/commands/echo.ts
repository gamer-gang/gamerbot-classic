import { Message } from "discord.js";
import { Command } from ".";
import { CmdArgs } from '../types';

export class CommandEcho implements Command {
  cmd = 'echo';
  docs = [
    {
      usage: 'echo <...msg>',
      description: 'tells you what you just said',
    }
  ];

  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args } = cmdArgs;

    msg.channel.send(args.join(' '));
  }
}