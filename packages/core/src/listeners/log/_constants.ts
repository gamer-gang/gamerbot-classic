import { Guild, TextChannel } from 'discord.js';

export type LogClientEventName = typeof logClientEvents[number];
export type LogGamerbotCommandEventName = typeof logGamerbotCommandEvents[number];
export type LogEventName = typeof logEvents[number];
export type LogEventHandler = `on${Capitalize<LogEventName>}`;
export type LogHandlers = Partial<
  Record<
    LogEventHandler,
    (guild: Guild, logChannel: TextChannel, preInfo?: any) => (...args: any[]) => Promise<void>
  >
>;
export const logClientEvents = [
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
  'gamerbotCommandBack',
  'gamerbotCommandKick',
  'gamerbotCommandPurge',
  'gamerbotCommandRole',
  'gamerbotCommandUnban',
  'gamerbotCommandPlay',
  'gamerbotCommandSkip',
  'gamerbotCommandShuffle',
  'gamerbotCommandStop',
] as const;

export const logEvents = [...logClientEvents, ...logGamerbotCommandEvents] as const;

// https://coolors.co/gradient-palette/40c9ff-e81cff
export const logColors = [
  0x40c9ff, 0x4fb9ff, 0x5faaff, 0x6e9aff, 0x7d8aff, 0x8c7aff, 0x9c6bff, 0xab5bff, 0xba4bff,
  0xc93bff, 0xd92cff, 0xe81cff,
];
