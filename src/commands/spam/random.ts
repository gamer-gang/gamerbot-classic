import { Message } from 'discord.js';
import { Command } from '..';
import { CmdArgs } from '../../types';
// @ts-ignore
import * as randomWords from 'random-words';

export class CommandRandom implements Command {
  cmd = 'random';
  docs = {
    usage: 'random [msgs=1]',
    description: 'ok',
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args, configStore } = cmdArgs;

    if (!configStore.get(msg.guild?.id as string).allowSpam) {
      return msg.channel.send('spam commands are off');
    }

    const messages: string[] = [];

    let amount = 1;
    if (args[0]) {
      if (isNaN(parseInt(args[0]))) return msg.channel.send('invalid amount');
      else if (amount > 10) return msg.channel.send('too many, max 10');

      amount = parseInt(args[0]);
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

    for (const message of messages) {
      msg.channel.send(message);
    }
  }
}
