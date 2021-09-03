import { codeBlock } from '@discordjs/builders';
import { Embed } from '@gamerbot/util';
import { say } from '@wiisportsresorts/cowsay';
import { Message } from 'discord.js';
import { ChatCommand, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';

export class CommandCowsay extends ChatCommand {
  name = ['cowsay'];
  // yargs: yargsParser.Options = {
  //   boolean: ['delete', 'list'],
  //   string: ['cow'],
  //   alias: {
  //     delete: 'd',
  //     cow: 'f',
  //     list: 'l',
  //   },
  //   default: {
  //     delete: false,
  //   },
  // };

  help = [
    {
      usage: 'cowsay [-d, --delete] <...msg>',
      description: 'you know what it does (`--delete` deletes source command)',
    },
  ];
  data: CommandOptions = {
    description: 'Cow says stuff',
    options: [
      {
        name: 'text',
        description: 'Text to force the cow to say',
        type: 'STRING',
      },
    ],
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    // if (args.list) {
    //   msg.channel.stopTyping(true);
    //   return Embed.info('Cows', codeBlock(Object.keys(cows).join(', '))).reply(msg);
    // }

    const text = event.isInteraction() ? event.options.getString('text') : event.args;

    if (!text) return event.reply(Embed.error('Nothing to say').ephemeral());

    // if (args._.length == 0 || /^\s+$/.test(args._.join(' '))) {
    //   msg.channel.stopTyping(true);
    //   return Embed.error('nothing to say').reply(msg);
    // }

    // msg.channel.startTyping();

    // args.delete && msg.deletable && msg.delete();

    // const cow = Object.keys(cows).includes(args.cow)
    //   ? cows[args.cow as keyof typeof import('@wiisportsresorts/cowsay/lib/cows')]
    //   : undefined;

    // if (args.cow && !cow) return Embed.error('Unknown cow').reply(msg);

    const formatted = say(text, {
      W: 48,
      // cow,
    }).replace(/```/g, "'''"); // prevent codeblock escaping

    if (formatted.length > 1980) return event.reply(Embed.error('Text too long').ephemeral());

    event.reply(codeBlock(formatted));

    // const messages = text
    //   .match(/(.|\n){1,1990}\n/g)
    //   ?.map(message => codeBlock(message)) as string[];

    // for (const text of messages) await msg.channel.send(text);

    // msg.channel.stopTyping(true);
  }
}
