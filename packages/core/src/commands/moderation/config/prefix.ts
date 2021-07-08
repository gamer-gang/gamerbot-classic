import { Context } from '@gamerbot/types';
import { Embed, regExps } from '@gamerbot/util';
import { Message } from 'discord.js';
import { Config } from '../../../entities/Config';

export const prefix = async (
  config: Config,
  context: Context,
  value?: string
): Promise<void | Message> => {
  const { msg } = context;

  if (!value) return Embed.info(`prefix is \`${config.prefix}\``).reply(msg);

  if (value?.includes(' ')) return Embed.error('no spaces allowed in prefix').reply(msg);
  if (!regExps.ascii.test(value))
    return Embed.error('only ascii characters allowed in prefix').reply(msg);
  if (value.length > 16) return Embed.error('max 16 characters').reply(msg);

  config.prefix = value;

  return Embed.success(`prefix is now ${config.prefix}`).reply(msg);
};
