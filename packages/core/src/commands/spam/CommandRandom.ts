import { Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import randomWords from 'random-words';
import { Command, CommandDocs, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';

export class CommandRandom extends Command {
  cmd = ['random'];
  // yargs: yargsParser.Options = {
  //   number: ['messages'],
  //   alias: { messages: 'm' },
  //   default: { messages: 1 },
  // };
  docs: CommandDocs = [
    {
      usage: 'random',
      description: 'ok',
    },
  ];
  commandOptions: CommandOptions = {
    description: 'Random English',
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    if (!event.guildConfig.allowSpam)
      return event.reply(Embed.error('Spam commands are off').ephemeral());

    // const messages: string[] = [];
    // const amount = args.messages;

    // msg.channel.startTyping(amount);

    // const errors: string[] = [];
    // if (isNaN(amount) || amount < 1) errors.push('invalid message amount');
    // if (amount > 10) errors.push('too many messages, max 10');
    // if (errors.length) {
    // Embed.error('errors', errors.join('\n')).reply(msg);
    // msg.channel.stopTyping(true);
    // return;
    // }

    // for (let i = 0; i < amount; i++) {
    let text = '';
    while (true) {
      const append = ' ' + randomWords(1);
      if (text.length + append.length > 2000) break;
      text += append;
    }
    // messages.push(text);
    // }

    // for (const message of messages) await msg.channel.send(message);
    // msg.channel.stopTyping(true);

    event.reply(text);
  }
}
