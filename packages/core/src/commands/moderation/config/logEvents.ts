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
      return msg.channel.send(Embed.info('no subscribed events'));

    const events = intToLogEvents(config.logSubscribedEvents);

    return msg.channel.send(
      Embed.info(
        `current logged events (**${config.logSubscribedEvents}**)`,
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
    return msg.channel.send(
      Embed.error('invalid permissions', `valid permissions${codeBlock(logEventNames.join('\n'))}`)
    );

  config.logSubscribedEvents = BigInt(int);

  if (config.logChannelId)
    return msg.channel.send(
      Embed.success(
        `successfully subscribed to the following events (**${int}**):`,
        codeBlock(intToLogEvents(int).join('\n'))
      )
    );
  else
    return msg.channel.send(
      Embed.success(
        `successfully subscribed to the following events (**${int}**).\ndon't forget to set a log channel (\`$config logChannel <channel>\`)!`,
        codeBlock(intToLogEvents(int).join('\n'))
      )
    );
};
