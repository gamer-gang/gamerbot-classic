import {
  Channel,
  Guild,
  GuildChannel,
  GuildEmoji,
  GuildMember,
  Invite,
  PartialGuildMember,
  Role,
  VoiceState,
} from 'discord.js';
import type { ChannelTypes } from 'discord.js/typings/enums';
import { getClient } from './_client';

const guildChannelTypes: (keyof typeof ChannelTypes)[] = [
  'GUILD_TEXT',
  'GUILD_VOICE',
  'GUILD_STAGE_VOICE',
  'GUILD_CATEGORY',
  'GUILD_STORE',
  'GUILD_NEWS',
  'GUILD_NEWS_THREAD',
  'GUILD_NEWS_THREAD',
  'GUILD_PUBLIC_THREAD',
  'GUILD_PRIVATE_THREAD',
  'UNKNOWN',
];

export type GuildHandle = any /* ClientEvents[LogClientEventName][0] */ | Channel;

const isGuild = (value: GuildHandle): value is Guild => {
  const client = getClient();
  return !!client.guilds.cache.get((value as Guild).id);
};

const isInvite = (value: GuildHandle): value is Invite => (value as Invite).code !== undefined;

const isChannel = (value: GuildHandle): value is Channel =>
  guildChannelTypes.includes((value as Channel).type) && (value as Channel).isText !== undefined;

type HasGuild = GuildMember | GuildChannel | PartialGuildMember | VoiceState | GuildEmoji | Role;

const hasGuild = (value: GuildHandle): value is HasGuild => !!(value as HasGuild).guild?.id;

export const findGuild = (handle: GuildHandle): Guild | undefined => {
  const client = getClient();
  if (!handle) return;
  if (isGuild(handle)) return handle;

  if (hasGuild(handle)) return client.guilds.cache.get(handle.guild.id);

  if (isInvite(handle)) {
    const cached = Array.from(client.inviteCache.values()).find(
      cached => cached.code === handle.code
    );
    if (!cached) return;
    return client.guilds.cache.get(cached.guildId);
  }

  if (isChannel(handle)) {
    // try to find a guild with this channelarray
    const guild = [...client.guilds.cache.values()].find(guild =>
      guild.channels.cache.get(handle.id)
    );

    return guild;
  }

  // impossible to get guild for DM or presence, ignore
};
