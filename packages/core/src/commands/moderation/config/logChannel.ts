import { Message, Snowflake } from 'discord.js';
import { Config } from '../../../entities/Config';
import { Context } from '../../../types';
import { Embed } from '../../../util';

export const logChannel = async (
  config: Config,
  context: Context,
  value?: string
): Promise<void | Message> => {
  const { msg } = context;

  if (!value) {
    if (config.logChannelId)
      return Embed.info(
        `log channel is set to <#${config.logChannelId}>`,
        `use \`${config.prefix}config logChannel unset\` to remove`
      ).reply(msg);
    return Embed.warning('no log channel set').reply(msg);
  }

  if (value === 'unset') {
    delete config.logChannelId;
    return Embed.warning('unset log channel', 'logs will no longer be sent').reply(msg);
  }

  const channelId = value.replace(/[<#>]/g, '') as Snowflake;
  const channel = msg.guild?.channels.cache.get(channelId);
  if (!channel) return Embed.error('invalid channel `' + value + '`').reply(msg);
  if (channel.type !== 'text') return Embed.error('only text channels allowed').reply(msg);

  config.logChannelId = channel.id;

  if (BigInt(config.logSubscribedEvents) + 1n - 1n !== 0n)
    return Embed.success(`log channel set to ${channel}`).reply(msg);
  else
    return Embed.success(
      `log channel set to **${channel}**`,
      "don't forget to subscribe to some events (`$config logEvents <int/event list>`)!"
    ).reply(msg);
};
