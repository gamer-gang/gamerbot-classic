import { Message } from 'discord.js';

import { Config } from '../../../entities/Config';
import { CmdArgs } from '../../../types';
import { asciiRegExp } from '../../../util';

export const prefix = async (
  config: Config,
  cmdArgs: CmdArgs,
  value?: string
): Promise<void | Message> => {
  const { msg } = cmdArgs;

  if (!value) return msg.channel.send(`prefix is \`${config.prefix}\``);

  if (value?.includes(' ')) return msg.channel.send('no spaces');
  if (!asciiRegExp.test(value)) return msg.channel.send('only ascii characters allowed');
  if (value.length > 16) return msg.channel.send('too long');

  config.prefix = value;

  return msg.channel.send(`prefix is now ${config.prefix}`);
};
