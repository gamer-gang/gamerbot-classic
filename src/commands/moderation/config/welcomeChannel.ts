import { Message } from 'discord.js';

import { Config } from '../../../entities/Config';
import { CmdArgs } from '../../../types';
import { Embed } from '../../../util';

export const welcomeChannel = async (
  config: Config,
  cmdArgs: CmdArgs,
  value?: string
): Promise<void | Message> => {
  const { msg } = cmdArgs;

  if (!value) {
    if (config.welcomeChannelId)
      return msg.channel.send(
        Embed.info(
          `welcome channel is set to <#${config.welcomeChannelId}>`,
          'use `$config welcomeChannel unset` to remove'
        )
      );
    return msg.channel.send(Embed.warning('no welcome channel set'));
  }

  if (value === 'unset') {
    delete config.welcomeChannelId;
    return msg.channel.send(
      Embed.warning(
        'unset welcome channel',
        'welcome messages will go to the system message channel'
      )
    );
  }

  const channelId = value.replace(/[<#>]/g, '');
  const channel = msg.guild?.channels.cache.get(channelId);
  if (!channel) return msg.channel.send(Embed.error('invalid channel `' + value + '`'));
  if (channel.type !== 'text') return msg.channel.send(Embed.error('only text channels allowed'));

  config.welcomeChannelId = channel.id;
  return msg.channel.send(Embed.success(`welcome channel set to ${channel}`));
};
