import { Embed, hasMentions } from '@gamerbot/util';
import { Message } from 'discord.js';
import { ChatCommand, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';

export class CommandSpam extends ChatCommand {
  name = ['spam'];
  // yargs: yargsParser.Options = {
  //   alias: {
  //     repetitions: 'r',
  //     messages: 'm',
  //     tts: 't',
  //     fill: 'f',
  //   },
  //   boolean: ['tts', 'fill'],
  //   number: ['repetitions', 'messages'],
  //   default: {
  //     repetitions: 5,
  //     messages: 4,
  //     fill: false,
  //     tts: false,
  //   },
  // };
  // [-r, --repetitions <int>] [-m, --messages <int>] [-f, --fill] [-t, --tts]
  help = [
    {
      usage: 'spam <...text>',
      description: 'make the words appear on the screen',
    },
  ];
  data: CommandOptions = {
    description: 'Make the words appear on the screen',
    options: [
      {
        name: 'text',
        description: 'Text to repeat',
        type: 'STRING',
        required: true,
      },
    ],
  };

  async execute(event: CommandEvent): Promise<void | Message> {
    if (!event.guildConfig.allowSpam)
      return event.reply(Embed.error('Spam commands are off').ephemeral());

    const spamText = event.isInteraction() ? event.options.getString('text') : event.args.trim();

    if (!spamText) return event.reply(Embed.error('No text to send').ephemeral());
    if (hasMentions(spamText)) return event.reply(Embed.error('No').ephemeral());

    // const { tts, repetitions, messages } = args;

    // msg.channel.startTyping(messages);

    // const errors: string[] = [];
    // if (isNaN(repetitions) || repetitions < 1) errors.push('invalid repetition count');
    // if (isNaN(messages) || messages < 1) errors.push('invalid message count');
    // if (messages > 10) errors.push('too many messages, max 10');
    // if (errors.length) {
    // Embed.error('errors', errors.join('\n')).reply(msg);
    // msg.channel.stopTyping(true);
    // return;
    // }

    // const spamText = args._.join(' ').trim();
    let output = '';

    // if (args.fill) {
    while (true) {
      if (output.length + spamText.length + 1 > 2000) break;
      output += ' ' + spamText;
    }
    // } else {
    //   if ((spamText.length + 1) * repetitions > 2000) {
    //     msg.channel.stopTyping(true);
    //     return Embed.error(
    //       'too many repetitions (msg is over 2000 chars), use "--fill" to fill the entire message'
    //     ).reply(msg);
    //   }

    //   for (let i = 0; i < repetitions; i++) output += ' ' + spamText;
    // }

    // for (let i = 0; i < messages; i++) await msg.channel.send({ content: output, tts });
    // msg.channel.stopTyping(true);
    event.reply(output);
  }
}
