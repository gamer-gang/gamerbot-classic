import { Message } from 'discord.js';
import _ from 'lodash';

import { Command } from '../..';
import { Config } from '../../../entities/Config';
import { Context } from '../../../types';
import { codeBlock, Embed } from '../../../util';
import { allowSpam } from './allowspam';
import { egg } from './egg';
import { prefix } from './prefix';
import { welcomeChannel } from './welcomeChannel';
import { welcomeMessage } from './welcomeMessage';

const configHandlers: Record<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (config: Config, context: Context, value?: string) => Promise<any>
> = { welcomeChannel, welcomeMessage, prefix, egg, allowSpam };

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

    if (!args._[0] || !Object.keys(configHandlers).includes(args._[0]))
      return msg.channel.send(
        Embed.error(
          'invalid config option',
          'valid options:\n' + codeBlock(Object.keys(configHandlers).join('\n'))
        )
      );

    configHandlers[args._[0]](config, context, _.tail(args._).join(' '));
  }
}
