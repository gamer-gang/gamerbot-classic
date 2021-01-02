import { Message } from 'discord.js';
import { Command } from '..';
import { Context } from '../../types';

export class CommandBlackjack implements Command {
  cmd = 'blackjack';
  docs = {
    usage: 'blackjack [bid=5]',
    description: 'play blackjac',
  };
  async execute(cmdArgs: Context): Promise<void | Message> {
    return cmdArgs.msg.channel.send('not implemented sowwy');
  }
}
