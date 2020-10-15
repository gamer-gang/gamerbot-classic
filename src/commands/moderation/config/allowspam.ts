import { Message } from 'discord.js';

import { Config } from '../../../entities/Config';
import { CmdArgs } from '../../../types';

export const allowSpam = async (
  config: Config,
  cmdArgs: CmdArgs,
  value?: string
): Promise<void | Message> => {
  const { msg } = cmdArgs;

  if (!value) return msg.channel.send(`spam is ${config.allowSpam ? 'on' : 'off'}`);

  if (!msg.guild?.member(msg.author?.id as string)?.hasPermission('ADMINISTRATOR'))
    return msg.channel.send('missing `ADMINISTRATOR` permission');

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
      return msg.channel.send('value must be one of `yes|y|true|on|no|n|false|off`');
  }

  await msg.channel.send(`spam commands are now ${config.allowSpam ? 'on' : 'off'}`);
};
