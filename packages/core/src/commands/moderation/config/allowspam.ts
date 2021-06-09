import { Message } from 'discord.js';
import { Config } from '../../../entities/Config';
import { Context } from '../../../types';
import { Embed } from '../../../util';

export const allowSpam = async (
  config: Config,
  context: Context,
  value?: string
): Promise<void | Message> => {
  const { msg } = context;

  if (!value) return msg.channel.send(Embed.info(`spam is ${config.allowSpam ? 'on' : 'off'}`));

  switch (value) {
    case 'yes':
    case 'y':
    case 'true':
    case 'on':
      config.allowSpam = true;
      break;
    case 'no':
    case 'n':
    case 'false':
    case 'off':
      config.allowSpam = false;
      break;
    default:
      return msg.channel.send(
        Embed.error('bad value', 'value must be one of `yes|y|true|on|no|n|false|off`')
      );
  }

  await msg.channel.send(Embed.success(`spam commands are now ${config.allowSpam ? 'on' : 'off'}`));
};
