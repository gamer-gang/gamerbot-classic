import { Message } from 'discord.js';

import { Config } from '../../../entities/Config';
import { Context } from '../../../types';
import { Embed, regExps } from '../../../util';

export const prefix = async (
  config: Config,
  context: Context,
  value?: string
): Promise<void | Message> => {
  const { msg } = context;

  if (!value) return msg.channel.send(Embed.info(`prefix is \`${config.prefix}\``));

  if (value?.includes(' ')) return msg.channel.send(Embed.error('no spaces allowed in prefix'));
  if (!regExps.ascii.test(value))
    return msg.channel.send(Embed.error('only ascii characters allowed in prefix'));
  if (value.length > 16) return msg.channel.send(Embed.error('max 16 characters'));

  config.prefix = value;

  return msg.channel.send(Embed.success(`prefix is now ${config.prefix}`));
};
