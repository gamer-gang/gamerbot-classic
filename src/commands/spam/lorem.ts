import { Message } from 'discord.js';
import { LoremIpsum } from 'lorem-ipsum';
import yargsParser from 'yargs-parser';

import { Command, CommandDocs } from '..';
import { CmdArgs } from '../../types';

export class CommandLorem implements Command {
  cmd = 'lorem';
  yargsSchema: yargsParser.Options = {
    number: ['messages'],
    alias: {
      messages: 'm',
    },
    default: {
      messages: 1,
    },
  };
  docs: CommandDocs = {
    usage: 'lorem [-m, --messages <int>]',
    description: 'ok',
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const {
      msg,
      args,
      em,
      config: { allowSpam },
    } = cmdArgs;

    if (!allowSpam) {
      return msg.channel.send('spam commands are off');
    }

    const lorem = new LoremIpsum({
      seed: Date.now().toString(),
    });

    const messages: string[] = [];
    const amount = args.messages;

    if (isNaN(amount)) return msg.channel.send('invalid amount');
    else if (amount > 10) return msg.channel.send('too many, max 10');

    for (let i = 0; i < amount; i++) {
      let text = '';
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const append = ' ' + lorem.generateSentences(1);
        if (text.length + append.length > 2000) break;
        text += append;
      }
      messages.push(text);
    }

    for (const message of messages) {
      msg.channel.send(message);
    }
  }
}
