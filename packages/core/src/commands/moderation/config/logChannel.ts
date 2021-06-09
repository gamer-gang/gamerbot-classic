import { Message } from 'discord.js';
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
      return msg.channel.send(
        Embed.info(
          `log channel is set to <#${config.logChannelId}>`,
          `use \`${config.prefix}config logChannel unset\` to remove`
        )
      );
    return msg.channel.send(Embed.warning('no log channel set'));
  }

  if (value === 'unset') {
    delete config.logChannelId;
    return msg.channel.send(Embed.warning('unset log channel', 'logs will no longer be sent'));
  }

  const channelId = value.replace(/[<#>]/g, '');
  const channel = msg.guild?.channels.cache.get(channelId);
  if (!channel) return msg.channel.send(Embed.error('invalid channel `' + value + '`'));
  if (channel.type !== 'text') return msg.channel.send(Embed.error('only text channels allowed'));

  config.logChannelId = channel.id;

  if (BigInt(config.logSubscribedEvents) + 1n - 1n !== 0n)
    return msg.channel.send(Embed.success(`log channel set to ${channel}`));
  else
    return msg.channel.send(
      Embed.success(
        `log channel set to **${channel}**`,
        "don't forget to subscribe to some events (`$config logEvents <int/event list>`)!"
      )
    );
};
