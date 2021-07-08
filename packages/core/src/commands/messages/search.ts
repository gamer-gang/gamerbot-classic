import { Context } from '@gamerbot/types';
import { Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import { Command } from '..';

export class CommandSearch implements Command {
  cmd = ['search', 'lmgtfy', 'google', 'ddg', 'duckduckgo'];
  docs = {
    usage: 'search <...query>',
    description: 'search the web',
  };
  async execute(context: Context): Promise<void | Message> {
    const { msg, args, cmd } = context;

    if (args._.length === 0) return Embed.error('No search query provided').reply(msg);

    const query = args._.map(word => encodeURIComponent(word)).join('+');

    const url =
      cmd === 'ddg' ? `https://duckduckgo.com/?q=${query}` : `https://lmgtfy.app/?q=${query}`;

    msg.reply(url);
  }
}
