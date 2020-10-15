import { Message } from 'discord.js';

import { Config } from '../../../entities/Config';
import { CmdArgs } from '../../../types';

export const welcomeChannel = async (
  config: Config,
  cmdArgs: CmdArgs,
  value?: string
): Promise<void | Message> => {
  const { msg } = cmdArgs;

  if (!value) {
    if (config.welcomeChannelId)
      return msg.channel.send(
        `welcome channel is set to <#${config.welcomeChannelId}> (\`$config welcomeChannel unset\` to remove)`
      );
    return msg.channel.send('no welcome channel set');
  }

  console.log(value);

  if (value === 'unset') {
    delete config.welcomeChannelId;
    return msg.channel.send(
      'unset welcome channel; welcome messages will go to the system message channel'
    );
  }

  const channelId = value.replace(/(<#|>)/g, '');
  const channel = msg.guild?.channels.cache.get(channelId);
  if (!channel) return msg.channel.send('invalid channel');
  if (channel.type !== 'text') return msg.channel.send('only text channels allowed');

  config.welcomeChannelId = channel.id;
  return msg.channel.send(`welcome channel set to ${channel}`);
};
