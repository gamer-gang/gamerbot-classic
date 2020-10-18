import { Message } from 'discord.js';

import { Command } from '..';
import { CmdArgs } from '../../types';
import { Embed } from '../../util';

export class CommandAbout implements Command {
  cmd = 'about';
  docs = {
    usage: 'about',
    description: 'Show about message.',
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const embed = new Embed().setTitle('about!!!!!!1');
    embed
      .addField('wheere is source code', 'https://github.com/gamer-gang/gamerbot')
      .addField('nice pfp', 'make by @qqq#0447')
      .addField('a', 'b');
    return cmdArgs.msg.channel.send(embed);
  }
}
