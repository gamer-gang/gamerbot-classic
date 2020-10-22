import { Message } from 'discord.js';

import { Config } from '../../../entities/Config';
import { CmdArgs } from '../../../types';
import { Embed, regExps } from '../../../util';

export const prefix = async (
  config: Config,
  cmdArgs: CmdArgs,
  value?: string
): Promise<void | Message> => {
  const { msg } = cmdArgs;

  if (!value) return msg.channel.send(new Embed({ title: `prefix is \`${config.prefix}\`` }));

  if (value?.includes(' '))
    return msg.channel.send(new Embed({ intent: 'error', title: 'no spaces allowed in prefix' }));
  if (!regExps.ascii.test(value))
    return msg.channel.send(
      new Embed({ intent: 'error', title: 'only ascii characters allowed in prefix' })
    );
  if (value.length > 16)
    return msg.channel.send(new Embed({ intent: 'error', title: 'max 16 characters' }));

  config.prefix = value;

  return msg.channel.send(
    new Embed({ intent: 'success', title: `prefix is now ${config.prefix}` })
  );
};
