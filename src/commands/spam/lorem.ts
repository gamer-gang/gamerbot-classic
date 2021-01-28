import { Message } from 'discord.js';
import { LoremIpsum } from 'lorem-ipsum';
import yargsParser from 'yargs-parser';

import { Command, CommandDocs } from '..';
import { Context } from '../../types';
import { Embed } from '../../util';

export class CommandLorem implements Command {
  cmd = 'lorem';
  yargs: yargsParser.Options = {
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
  async execute(context: Context): Promise<void | Message> {
    const {
      msg,
      args,
      config: { allowSpam },
    } = context;

    if (!allowSpam) return msg.channel.send(Embed.error('spam commands are off'));

    const lorem = new LoremIpsum({ seed: Date.now().toString() });

    const messages: string[] = [];
    const amount = args.messages;

    const errors: string[] = [];
    if (isNaN(amount) || amount < 1) errors.push('invalid message amount');
    if (amount > 10) errors.push('too many messages, max 10');
    if (errors.length) return msg.channel.send(Embed.error('errors', errors.join('\n')));

    for (let i = 0; i < amount; i++) {
      let text = '';
      while (true) {
        const append = ' ' + lorem.generateSentences(1);
        if (text.length + append.length > 2000) break;
        text += append;
      }
      messages.push(text);
    }

    for (const message of messages) msg.channel.send(message);
  }
}
