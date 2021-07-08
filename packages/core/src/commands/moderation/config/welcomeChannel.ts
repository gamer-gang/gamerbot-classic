import { Context } from '@gamerbot/types';
import { Embed } from '@gamerbot/util';
import { Message, Snowflake } from 'discord.js';
import { Config } from '../../../entities/Config';

export const welcomeChannel = async (
  config: Config,
  context: Context,
  value?: string
): Promise<void | Message> => {
  const { msg } = context;

  if (!value) {
    if (config.welcomeChannelId)
      return Embed.info(
        `welcome channel is set to <#${config.welcomeChannelId}>`,
        `use \`${config.prefix}config welcomeChannel unset\` to remove`
      ).reply(msg);

    return Embed.warning('no welcome channel set').reply(msg);
  }

  if (value === 'unset') {
    delete config.welcomeChannelId;
    return Embed.warning(
      'unset welcome channel',
      'welcome messages will go to the system message channel'
    ).reply(msg);
  }

  const channelId = value.replace(/[<#>]/g, '') as Snowflake;
  const channel = msg.guild?.channels.cache.get(channelId);
  if (!channel) return Embed.error('invalid channel `' + value + '`').reply(msg);
  if (channel.type !== 'text') return Embed.error('only text channels allowed').reply(msg);

  config.welcomeChannelId = channel.id;
  return Embed.success(`welcome channel set to ${channel}`).reply(msg);
};
