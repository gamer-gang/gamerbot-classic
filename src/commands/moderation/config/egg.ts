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

  if (!value)
    return msg.channel.send(new Embed({ title: `egg is ${config.allowSpam ? 'on' : 'off'}` }));
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
      return msg.channel.send(Embed.error('value must be one of `yes|y|true|on|no|n|false|off`'));
  }

  return msg.channel.send(
    new Embed({ intent: 'success', title: `egg ${config.egg ? 'activated' : 'off (but why???)'}` })
  );
};
