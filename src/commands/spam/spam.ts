import { Message } from 'discord.js';
import yargsParser from 'yargs-parser';

import { Command } from '..';
import { Context } from '../../types';
import { Embed, hasMentions } from '../../util';

export class CommandSpam implements Command {
  cmd = 'spam';
  yargs: yargsParser.Options = {
    alias: {
      repetitions: 'r',
      messages: 'm',
      tts: 't',
      fill: 'f',
    },

    boolean: ['tts', 'fill'],
    number: ['repetitions', 'messages'],
    default: {
      repetitions: 5,
      messages: 4,
      fill: false,
      tts: false,
    },
  };
  docs = {
    usage:
      'spam [-r, --repetitions <int>] [-m, --messages <int>] [-f, --fill] [-t, --tts] <...text>',
    description: 'make the words appear on the screen',
  };
  async execute(context: Context): Promise<void | Message> {
    const {
      msg,
      args,
      config: { allowSpam },
    } = context;

    if (!allowSpam) return msg.channel.send(Embed.error('spam commands are off'));
    if (hasMentions(args._.join(' ') as string)) return msg.channel.send('no');

    const { tts, repetitions, messages } = args;

    const errors: string[] = [];
    if (isNaN(repetitions) || repetitions < 1) errors.push('invalid repetition count');
    if (isNaN(messages) || messages < 1) errors.push('invalid message count');
    if (messages > 10) errors.push('too many messages, max 10');
    if (!args._[0]) errors.push(`no text to send`);
    if (errors.length) return msg.channel.send(Embed.error('errors', errors.join('\n')));

    const spamText = args._.join(' ').trim();
    let output = '';

    if (args.fill) {
      while (true) {
        if (output.length + spamText.length + 1 > 2000) break;
        output += ' ' + spamText;
      }
    } else {
      if ((spamText.length + 1) * repetitions > 2000)
        return msg.channel.send(
          Embed.error(
            'too many repetitions (msg is over 2000 chars), use "--fill" to fill the entire message'
          )
        );

      for (let i = 0; i < repetitions; i++) output += ' ' + spamText;
    }

    for (let i = 0; i < messages; i++) msg.channel.send(output, { tts });
  }
}
