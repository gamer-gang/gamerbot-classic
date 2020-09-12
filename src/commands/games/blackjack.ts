import { Message } from 'discord.js';

import { Command } from '..';
import { CmdArgs } from '../../types';

export class CommandBlackjack implements Command {
  cmd = 'blackjack';
  docs = {
    usage: 'blackjack [bid=5]',
    description: 'play blackjac',
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    // TODO implement
  }
}
