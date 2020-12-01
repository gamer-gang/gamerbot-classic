import { Message } from 'discord.js';

import { Config } from '../../../entities/Config';
import { intToLogEvents, maxLogInteger } from '../../../listeners/log';
import { Context } from '../../../types';
import { codeBlock, Embed } from '../../../util';

export const logEvents = async (
  config: Config,
  context: Context,
  value?: string
): Promise<void | Message> => {
  const { msg } = context;

  if (!value) {
    // do not touch, it works
    if (BigInt(config.logSubscribedEvents) + 1n - 1n === 0n)
      return msg.channel.send(Embed.warning('no subscribed events'));

    const events = intToLogEvents(config.logSubscribedEvents);

    return msg.channel.send(
      Embed.info(
        `current logged events (${config.logSubscribedEvents})`,
        `use \`${config.prefix}config logChannel 0\` to stop receiving logs\n${codeBlock(
          events.join('\n')
        )}`
      )
    );
  }

  if (value === '0') {
    config.logSubscribedEvents = 0n;
    return msg.channel.send(
      Embed.warning('unset subscribed events', 'logs will no longer be sent')
    );
  }

  const int = value.startsWith('0b')
    ? parseInt(value.slice(2), 2)
    : value.startsWith('0x')
    ? parseInt(value.slice(2), 16)
    : parseInt(value, 10);

  if (isNaN(int) || !isFinite(int) || int < 1 || int > maxLogInteger)
    return msg.channel.send(
      Embed.error('invalid permissions integer', 'see <website> for more info')
    );

  config.logSubscribedEvents = BigInt(int);

  return msg.channel.send(
    Embed.success(
      'successfully subscribed to the following events:',
      codeBlock(intToLogEvents(int).join('\n'))
    )
  );
};
