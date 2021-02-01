import { Message } from 'discord.js';
import { Command } from '../..';
import { Config } from '../../../entities/Config';
import { Context } from '../../../types';
import { codeBlock, Embed } from '../../../util';
import { allowSpam } from './allowspam';
import { egg } from './egg';
import { logChannel } from './logChannel';
import { logEvents } from './logEvents';
import { prefix } from './prefix';
import { welcomeChannel } from './welcomeChannel';
import { welcomeMessage } from './welcomeMessage';

const configHandlers: Record<
  string,
  (config: Config, context: Context, value?: string) => Promise<any>
> = { welcomeChannel, welcomeMessage, prefix, egg, allowSpam, logChannel, logEvents };

export class CommandConfig implements Command {
  cmd = 'config';
  docs = {
    usage: 'config <option> [newValue]',
    description: 'get/set a config value',
  };
  async execute(context: Context): Promise<void | Message> {
    const { msg, args, config } = context;

    if (!msg.guild?.member(msg.author?.id as string)?.hasPermission('ADMINISTRATOR'))
      return msg.channel.send(Embed.error('you must be an administrator to use this command'));

    const handlerName = Object.keys(configHandlers).find(
      n => n.toLowerCase() === args._[0].toLowerCase()
    );

    if (!args._[0] || !handlerName)
      return msg.channel.send(
        Embed.error(
          'invalid config option',
          'valid options:\n' + codeBlock(Object.keys(configHandlers).join('\n'))
        )
      );

    configHandlers[handlerName](config, context, args._.slice(1).join(' '));
  }
}
