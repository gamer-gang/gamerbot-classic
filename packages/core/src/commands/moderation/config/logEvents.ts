import { Message } from 'discord.js';
import { Config } from '../../../entities/Config';
import {
  intToLogEvents,
  LogEventName,
  logEvents as logEventNames,
  maxLogInteger,
} from '../../../listeners/log';
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
      return Embed.info('no subscribed events').reply(msg);

    const events = intToLogEvents(config.logSubscribedEvents);

    return Embed.info(
      `current logged events (**${config.logSubscribedEvents}**)`,
      `use \`${config.prefix}config logChannel 0\` to stop receiving logs\n${codeBlock(
        events.join('\n')
      )}`
    ).reply(msg);
  }

  if (value === '0') {
    config.logSubscribedEvents = 0n;
    return Embed.warning('unset subscribed events', 'logs will no longer be sent').reply(msg);
  }

  const int = value.startsWith('0b')
    ? parseInt(value.slice(2), 2)
    : value.startsWith('0x')
    ? parseInt(value.slice(2), 16)
    : /^\d+$/.test(value)
    ? parseInt(value, 10)
    : /^\w+((\s+|\s*,\s*)\w+)*$/.test(value)
    ? value
        .split(value.includes(',') ? /\s*,\s*/g : /\s+/g)
        .map(v => {
          const index = logEventNames.indexOf(v as LogEventName);
          if (index === -1) return NaN;
          return 2 ** index;
        })
        .reduce((a, b) => a + b)
    : NaN;

  if (isNaN(int) || !isFinite(int) || int < 1 || int > maxLogInteger)
    return Embed.error(
      'invalid permissions',
      `valid permissions${codeBlock(logEventNames.join('\n'))}`
    ).reply(msg);

  config.logSubscribedEvents = BigInt(int);

  if (config.logChannelId)
    return Embed.success(
      `successfully subscribed to the following events (**${int}**):`,
      codeBlock(intToLogEvents(int).join('\n'))
    ).reply(msg);
  else
    return Embed.success(
      `successfully subscribed to the following events (**${int}**).\ndon't forget to set a log channel (\`$config logChannel <channel>\`)!`,
      codeBlock(intToLogEvents(int).join('\n'))
    ).reply(msg);
};
