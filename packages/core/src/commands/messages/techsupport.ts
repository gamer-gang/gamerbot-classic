import { Message } from 'discord.js';
import yargsParser from 'yargs-parser';
import { Command } from '..';
import { client } from '../../providers';
import { Context } from '../../types';

export class CommandTechSupport implements Command {
  cmd = ['techsupport', 'support'];
  yargs: yargsParser.Options = {
    alias: { delete: 'd' },
    boolean: ['delete'],
  };
  docs = [
    {
      usage: 'techsupport',
      description: 'request tech help (--delete or -d to delete)',
    },
  ];
  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;

    const emoji = client.getCustomEmoji('worksonmymachine');
    if (!emoji) return;

    args.delete && msg.deletable && msg.delete();
    msg.channel.send(`${emoji}`);
  }
}
