import { Message } from 'discord.js';
import { Config } from '../../../entities/Config';
import { Context } from '../../../types';
import { Embed } from '../../../util';

export const egg = async (
  config: Config,
  context: Context,
  value?: string
): Promise<void | Message> => {
  const { msg } = context;

  if (!value) return Embed.info(`egg is ${config.allowSpam ? 'on' : 'off'}`).reply(msg);
  switch (value) {
    case 'yes':
    case 'y':
    case 'true':
    case 'on':
      config.egg = true;
      break;
    case 'no':
    case 'n':
    case 'false':
    case 'off':
      config.egg = false;
      break;
    default:
      return Embed.error('Value must be one of `yes|y|true|on|no|n|false|off`').reply(msg);
  }

  return Embed.success(`egg ${config.egg ? 'activated' : 'off (but why???)'}`).reply(msg);
};
