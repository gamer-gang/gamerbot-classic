import { Message } from 'discord.js';
import { Command, commands } from '.';
import { Embed } from '../embed';
import { CmdArgs } from '../types';

export class CommandAbout implements Command {
  cmd = 'about';
  docs = {
    usage: 'about',
    description: 'Show about message.',
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const embed = new Embed().setTitle('about!!!!!!1');
    embed
      .addField('wheere is source code', 'on my computer')
      .addField('nice pfp', 'make by @qqq#0447')
      .addField('a', 'b');
    return cmdArgs.msg.channel.send(embed);
  }
}
