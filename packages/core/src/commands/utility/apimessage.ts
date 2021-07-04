import { Message } from 'discord.js';
import { Command } from '..';
import { Context } from '../../types';
import { codeBlock, Embed, parseDiscohookJSON } from '../../util';

// eslint-disable-next-line no-useless-escape
// const urlRegExp = /^(https?|attachment):\/\/[a-z0-9\.\-\_]+\.[a-z0-9]+(\/[a-z0-9\/\.\-\_\$]+)?$/i;

export class CommandApiMessage implements Command {
  cmd = 'apimessage';
  docs = {
    usage: 'apimessage <json data>',
    description: 'create a message from api data (deletes source message)',
  };
  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;

    try {
      await msg.channel.send(parseDiscohookJSON(args._.join(' ')));
      msg.deletable && msg.delete();
    } catch (err) {
      msg.channel.send(Embed.error(codeBlock(err)));
    }
  }
}
