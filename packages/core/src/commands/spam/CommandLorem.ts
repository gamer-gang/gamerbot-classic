import { Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import { LoremIpsum } from 'lorem-ipsum';
import { Command, CommandDocs, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';

export class CommandLorem extends Command {
  cmd = ['lorem'];
  // yargs: yargsParser.Options = {
  //   number: ['messages'],
  //   alias: { messages: 'm' },
  //   default: { messages: 1 },
  // };
  docs: CommandDocs = [
    {
      usage: 'lorem',
      description: 'Lorem ipsum dolor amet',
    },
  ];
  commandOptions: CommandOptions = {
    description: 'Lorem ipsum dolor amet',
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    if (!event.guildConfig.allowSpam)
      return event.reply(Embed.error('Spam commands are off').ephemeral());

    // const messages: string[] = [];
    // const amount = event.isInteraction()
    //   ? event.options.getInteger('messages')
    //   : parseInt(event.argv[0]);

    // const errors: string[] = [];
    // if (isNaN(amount) || amount < 1) errors.push('Invalid message amount');
    // if (amount > 10) errors.push('Too many messages, max 10');
    // if (errors.length) {
    //   Embed.error('errors', errors.join('\n')).reply(msg);
    //   msg.channel.stopTyping(true);
    //   return;
    // }

    const lorem = new LoremIpsum({ seed: Date.now().toString() });

    // for (let i = 0; i < amount; i++) {
    let text = '';
    while (true) {
      const append = ' ' + lorem.generateSentences(1);
      if (text.length + append.length > 2000) break;
      text += append;
    }
    // messages.push(text);
    // }

    // for (const message of messages) await msg.channel.send(message);

    event.reply(text);
  }
}
