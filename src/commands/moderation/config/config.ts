import { Message } from 'discord.js';
import _ from 'lodash';

import { Command } from '../..';
import { Config } from '../../../entities/Config';
import { CmdArgs } from '../../../types';
import { Embed } from '../../../util';
import { allowSpam } from './allowspam';
import { egg } from './egg';
import { prefix } from './prefix';
import { welcomeChannel } from './welcomeChannel';
import { welcomeMessage } from './welcomeMessage';

const configHandlers: Record<
  string,
  (config: Config, cmdArgs: CmdArgs, value?: string) => Promise<void | Message>
> = { welcomeChannel, welcomeMessage, prefix, egg, allowSpam };

export class CommandConfig implements Command {
  cmd = 'config';
  docs = {
    usage: 'config <option> [newValue]',
    description: 'get/set a config value',
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args, config } = cmdArgs;

    if (!args._[0] || !Object.keys(configHandlers).includes(args._[0]))
      return msg.channel.send(
        new Embed({
          title: 'valid config options',
          description: '```\n' + Object.keys(configHandlers).join('\n') + '\n```',
        })
      );

    configHandlers[args._[0]](config, cmdArgs, _.tail(args._).join(' '));
  }
}
