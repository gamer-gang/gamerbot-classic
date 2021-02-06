import { RequestContext } from '@mikro-orm/core';
import {
  Guild,
  GuildAuditLogsEntry,
  GuildChannel,
  GuildEmoji,
  Message,
  PartialMessage,
} from 'discord.js';
import { logColors, logEvents, LogEventType } from '.';
import { Config } from '../../entities/Config';
import { client } from '../../providers';

type GuildSource = Message | PartialMessage | GuildChannel | GuildEmoji | Guild;

export const getConfig = async (
  source: Message | PartialMessage | GuildChannel | GuildEmoji | Guild
): Promise<Config> => {
  let guild: Guild;
  if (client.guilds.cache.get(source.id)) {
    guild = source as Guild;
  } else {
    guild = (source as Exclude<GuildSource, Guild>).guild as Guild;
  }

  const config = await (RequestContext.getEntityManager() ?? client.em).findOne(Config, {
    guildId: guild.id,
  });
  if (!config) throw new Error('Could not get config for ' + guild.name);
  return config;
};

export const getLatestAuditEvent = async (guild: Guild): Promise<GuildAuditLogsEntry> => {
  const auditLogs = await guild.fetchAuditLogs();
  return auditLogs.entries.array()[0];
};

export const logColorFor = (event: LogEventType): number =>
  logColors[Math.round((logEvents.indexOf(event) / logEvents.length) * logColors.length)];

export const formatValue = (content: unknown): string =>
  content == null
    ? 'null'
    : typeof content === 'boolean' ||
      typeof content === 'number' ||
      (typeof content === 'string' && /^\d+$/.test(content))
    ? content.toString()
    : `'${content}'`;
