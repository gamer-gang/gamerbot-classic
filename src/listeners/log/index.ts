import { Guild, TextChannel } from 'discord.js';
import { channelHandlers } from './channel';
import { commandHandlers } from './command';
import { emojiHandlers } from './emoji';
import { guildHandlers } from './guild';
import { guildBanHandlers } from './guildBan';
import { guildMemberHandlers } from './guildMember';
import { inviteHandlers } from './invite';

export type LogClientEventName = typeof logClientEvents[number];
export type LogGamerbotCommandEventName = typeof logGamerbotCommandEvents[number];
export type LogEventName = typeof logEvents[number];
export type LogEventHandler = `on${Capitalize<LogEventName>}`;
export type LogHandlers = Partial<
  Record<
    LogEventHandler,
    (guild: Guild, logChannel: TextChannel) => (...args: any[]) => Promise<void>
  >
>;

const logClientEvents = [
  'channelCreate',
  'channelDelete',
  'channelUpdate',
  'emojiCreate',
  'emojiDelete',
  'emojiUpdate',
  'guildBanAdd',
  'guildBanRemove',
  'guildMemberAdd',
  'guildMemberRemove',
  'guildMemberUpdate',
  'guildUpdate',
  'inviteCreate',
  'inviteDelete',
  'presenceUpdate',
  'roleCreate',
  'roleDelete',
  'roleUpdate',
  'voiceStateUpdate',
] as const;

export const logGamerbotCommandEvents = [
  'gamerbotCommandGif',
  'gamerbotCommandApimessage',
  'gamerbotCommandCowsay',
  'gamerbotCommandEcho',
  'gamerbotCommandEggleaderboard',
  'gamerbotCommandEz',
  'gamerbotCommandJoke',
  'gamerbotCommandConfig',
  'gamerbotCommandBan',
  'gamerbotCommandKick',
  'gamerbotCommandPurge',
  'gamerbotCommandRole',
  'gamerbotCommandUnban',
  'gamerbotCommandPlay',
  'gamerbotCommandPrevious',
  'gamerbotCommandSkip',
  'gamerbotCommandShuffle',
  'gamerbotCommandStop',
] as const;

export const logEvents = [...logClientEvents, ...logGamerbotCommandEvents] as const;

// https://coolors.co/gradient-palette/40c9ff-e81cff
export const logColors = [
  0x40c9ff,
  0x4fb9ff,
  0x5faaff,
  0x6e9aff,
  0x7d8aff,
  0x8c7aff,
  0x9c6bff,
  0xab5bff,
  0xba4bff,
  0xc93bff,
  0xd92cff,
  0xe81cff,
];

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

export const logHandlers: LogHandlers = {
  ...commandHandlers,
  ...channelHandlers,
  ...emojiHandlers,
  ...guildBanHandlers,
  ...guildMemberHandlers,
  ...guildHandlers,
  ...inviteHandlers,
};
