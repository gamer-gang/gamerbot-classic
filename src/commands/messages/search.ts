import { Message } from 'discord.js';
import { Command } from '..';
import { Context } from '../../types';
import { Embed } from '../../util';

export class CommandSearch implements Command {
  cmd = ['search', 'lmgtfy', 'google', 'ddg', 'duckduckgo'];
  docs = {
    usage: 'search <...query>',
    description: 'search the web',
  };
  async execute(context: Context): Promise<void | Message> {
    const { msg, args, cmd } = context;

    if (args._.length === 0) return msg.channel.send(Embed.error('No search query provided'));

    const query = args._.map(word => encodeURIComponent(word)).join('+');

    const url =
      cmd === 'ddg' ? `https://duckduckgo.com/?q=${query}` : `https://lmgtfy.app/?q=${query}`;

    msg.channel.send(url);
  }
}
