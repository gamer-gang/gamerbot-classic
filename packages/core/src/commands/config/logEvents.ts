import { codeBlock } from '@discordjs/builders';
import { Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import { Config } from '../../entities/Config';
import { intToLogEvents, maxLogInteger } from '../../listeners/log';
import { LogEventName, logEvents as logEventNames } from '../../listeners/log/_constants';
import { CommandEvent } from '../../models/CommandEvent';

export const logEvents = async (
  event: CommandEvent,
  newValue?: string
): Promise<void | Message> => {
  const config = await event.em.findOneOrFail(Config, { guildId: event.guild.id });

  if (!newValue) {
    // do not touch, it works
    if (BigInt(config.logSubscribedEvents) + 1n - 1n === 0n)
      return event.reply(Embed.info('No subscribed events'));

    const events = intToLogEvents(config.logSubscribedEvents);

    return event.reply(
      Embed.info(
        `Current logged events (**${config.logSubscribedEvents}**)`,
        `Use \`/config log-channel 0\` to stop receiving logs\n${codeBlock(events.join('\n'))}`
      )
    );
  }

  if (newValue === '0') {
    config.logSubscribedEvents = 0n;
    return event.reply(Embed.warning('Unset subscribed events', 'Logs will no longer be sent'));
  }

  const int = newValue.startsWith('0b')
    ? parseInt(newValue.slice(2), 2)
    : newValue.startsWith('0x')
    ? parseInt(newValue.slice(2), 16)
    : /^\d+$/.test(newValue)
    ? parseInt(newValue, 10)
    : /^\w+((\s+|\s*,\s*)\w+)*$/.test(newValue)
    ? newValue
        .split(newValue.includes(',') ? /\s*,\s*/g : /\s+/g)
        .map(v => {
          const index = logEventNames.indexOf(v as LogEventName);
          if (index === -1) return NaN;
          return 2 ** index;
        })
        .reduce((a, b) => a + b)
    : NaN;

  if (isNaN(int) || !isFinite(int) || int < 1 || int > maxLogInteger)
    return event.reply(
      Embed.error(
        'Invalid permissions',
        `Valid permissions:${codeBlock(logEventNames.join('\n'))}`
      ).ephemeral()
    );

  config.logSubscribedEvents = BigInt(int);

  if (config.logChannelId)
    return event.reply(
      Embed.success(
        `Successfully subscribed to the following events (**${int}**):`,
        codeBlock(intToLogEvents(int).join('\n'))
      )
    );
  else
    return event.reply(
      Embed.success(
        `Successfully subscribed to the following events (**${int}**).\nDon't forget to set a log channel (\`/config log-channel <channel>\`)!`,
        codeBlock(intToLogEvents(int).join('\n'))
      )
    );
};
