import { channelHandlers } from './channel';
import { commandHandlers } from './command';
import { emojiHandlers } from './emoji';
import { guildHandlers } from './guild';
import { guildBanHandlers } from './guildBan';
import { guildMemberHandlers } from './guildMember';
import { inviteHandlers } from './invite';
import { roleHandlers } from './role';
import { LogEventName, logEvents, LogHandlers } from './_constants';

export const maxLogInteger = logEvents.map((__, index) => 2 ** index).reduce((a, b) => a + b);

export const intToLogEvents = (permissions: number | bigint): LogEventName[] => {
  const bytes = parseInt(permissions.toString(10))
    .toString(2)
    .split('')
    .reverse()
    .map(bit => parseInt(bit))
    .filter(bit => {
      if (bit !== 0 && bit !== 1) throw new Error(`Parse error: expected 0 or 1 but got ${bit}.`);
      return true;
    });

  if (bytes.length > logEvents.length) throw new Error('Too many bytes.');

  bytes.push(...Array(logEvents.length - bytes.length).fill(0));

  return bytes.flatMap((b, index) => (b ? logEvents[index] : []));
};

export const logEventsToInt = (subscribedEvents: LogEventName[]): bigint => {
  return BigInt(
    subscribedEvents
      .map(event => [event, logEvents.indexOf(event as LogEventName)] as const)
      .filter(([event, i]) => {
        if (i === -1) throw new Error(`Invalid event '${event}'.`);
        return true;
      })
      .map(([, index]) => 2 ** index)
      .reduce((a, b) => a + b, 0)
  );
};

const logHandlers: LogHandlers = {
  ...commandHandlers,
  ...channelHandlers,
  ...emojiHandlers,
  ...guildBanHandlers,
  ...guildMemberHandlers,
  ...guildHandlers,
  ...inviteHandlers,
  ...roleHandlers,
};

export const getLogHandler = (name: keyof LogHandlers): LogHandlers[keyof LogHandlers] =>
  logHandlers[name];
