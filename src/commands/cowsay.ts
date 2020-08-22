import { Message } from 'discord.js';
import { Command } from '.';
import { CmdArgs } from '../types';
import { say } from 'cowsay';
import { LoremIpsum } from 'lorem-ipsum';

export class CommandCowsay implements Command {
  cmd = 'cowsay';
  docs = {
    usage: 'cowsay <...msg>',
    description: 'you know what it does',
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args } = cmdArgs;

    if (args.length == 0) {
      msg.channel.send('nothing to say');
      return;
    }

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
