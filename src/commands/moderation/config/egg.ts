import { Message } from 'discord.js';

import { Config } from '../../../entities/Config';
import { CmdArgs } from '../../../types';
import { Embed } from '../../../util';

export const egg = async (
  config: Config,
  cmdArgs: CmdArgs,
  value?: string
): Promise<void | Message> => {
  const { msg } = cmdArgs;

  if (!value)
    return msg.channel.send(new Embed({ title: `egg is ${config.allowSpam ? 'on' : 'off'}` }));

  if (!msg.guild?.member(msg.author?.id as string)?.hasPermission('ADMINISTRATOR'))
    return msg.channel.send(
      new Embed({ intent: 'error', title: 'missing `ADMINISTRATOR` permission' })
    );

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
      return msg.channel.send(
        new Embed({ intent: 'error', title: 'value must be one of `yes|y|true|on|no|n|false|off`' })
      );
  }

  await msg.channel.send(
    new Embed({ intent: 'success', title: `egg ${config.egg ? 'activated' : 'off (but why???)'}` })
  );
};
