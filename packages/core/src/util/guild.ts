import {
  Channel,
  ClientEvents,
  Guild,
  GuildChannel,
  GuildEmoji,
  GuildMember,
  Invite,
  PartialGuildMember,
  Role,
  VoiceState,
} from 'discord.js';
import { ChannelType } from 'discord.js/typings/enums';
import { LogClientEventName } from '../listeners/log';
import { client, inviteCache } from '../providers';

const guildChannelTypes: (keyof typeof ChannelType)[] = [
  'text',
  'voice',
  'category',
  'news',
  'store',
  'unknown',
];

export type GuildHandle = ClientEvents[LogClientEventName][0] | Channel;

const isGuild = (value: GuildHandle): value is Guild =>
  !!client.guilds.cache.get((value as Guild).id);

const isInvite = (value: GuildHandle): value is Invite => (value as Invite).code !== undefined;

const isChannel = (value: GuildHandle): value is Channel =>
  guildChannelTypes.includes((value as Channel).type) && (value as Channel).isText !== undefined;

type HasGuild = GuildMember | GuildChannel | PartialGuildMember | VoiceState | GuildEmoji | Role;

const hasGuild = (value: GuildHandle): value is HasGuild => !!(value as HasGuild).guild?.id;

export const findGuild = (handle: GuildHandle): Guild | undefined => {
  if (!handle) return;
  if (isGuild(handle)) return handle;

  if (hasGuild(handle)) return client.guilds.cache.get(handle.guild.id);

  if (isInvite(handle)) {
    const cached = Array.from(inviteCache.values()).find(cached => cached.code === handle.code);
    if (!cached) return;
    return client.guilds.cache.get(cached.guildId);
  }

  if (isChannel(handle)) {
    // try to find a guild with this channel
    const guild = client.guilds.cache.array().find(guild => {
      console.log(guild.channels.cache.array());
      return guild.channels.cache.get(handle.id);
    });

    return guild;
  }

  // impossible to get guild for DM or presence, ignore
};
