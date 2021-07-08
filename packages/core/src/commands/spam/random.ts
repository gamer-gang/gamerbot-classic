import { Context } from '@gamerbot/types';
import { Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import randomWords from 'random-words';
import yargsParser from 'yargs-parser';
import { Command, CommandDocs } from '..';

export class CommandRandom implements Command {
  cmd = 'random';
  yargs: yargsParser.Options = {
    number: ['messages'],
    alias: { messages: 'm' },
    default: { messages: 1 },
  };
  docs: CommandDocs = {
    usage: 'random [-m, --messages <int>]',
    description: 'ok',
  };
  async execute(context: Context): Promise<void | Message> {
    const {
      msg,
      args,
      config: { allowSpam },
    } = context;

    if (!allowSpam) return Embed.error('spam commands are off').reply(msg);

    const messages: string[] = [];
    const amount = args.messages;

    msg.channel.startTyping(amount);

    const errors: string[] = [];
    if (isNaN(amount) || amount < 1) errors.push('invalid message amount');
    if (amount > 10) errors.push('too many messages, max 10');
    if (errors.length) {
      Embed.error('errors', errors.join('\n')).reply(msg);
      msg.channel.stopTyping(true);
      return;
    }

    for (let i = 0; i < amount; i++) {
      let text = '';
      while (true) {
        const append = ' ' + randomWords(1);
        if (text.length + append.length > 2000) break;
        text += append;
      }
      messages.push(text);
    }

    for (const message of messages) await msg.channel.send(message);
    msg.channel.stopTyping(true);
  }
}
