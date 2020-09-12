import { say } from 'cowsay';
import { Message } from 'discord.js';
import { LoremIpsum } from 'lorem-ipsum';

import { Command } from '.';
import { CmdArgs } from '../types';
import { hasMentions } from '../util';

export class CommandCowsay implements Command {
  cmd = 'cowsay';
  docs = {
    usage: 'cowsay <...msg>',
    description: 'you know what it does',
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args } = cmdArgs;

    if (args.length == 0 || /^\s+$/.test(args.join(' '))) {
      msg.channel.send('nothing to say');
      return;
    }

    if (hasMentions(msg.content as string)) return msg.channel.send('yea i aint doin that');

    let cowtext = args.join(' ');

    if (args[0] == '$lorem') {
      cowtext = new LoremIpsum().generateParagraphs(1);
    }

    await msg.channel.send(
      `\`\`\`\n${say({
        text: cowtext,
        W: 48,
      })}\n\`\`\`\n`
    );
  }
}
