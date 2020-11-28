import { Guild, TextChannel, User } from 'discord.js';

import { client } from '../../providers';
import { Embed } from '../../util';
import { intToLogEvents, LogHandlers } from './log';
import { getConfig, getLatestAuditEvent, logColorFor } from './utils';

export const guildBanHandlers: LogHandlers = {
  onGuildBanAdd: async (guild: Guild, user: User) => {
    const config = await getConfig(guild);
    if (!config.logChannelId) return;
    const logChannel = client.channels.cache.get(config.logChannelId) as TextChannel;
    if (!logChannel) console.warn('could not get log channel for ' + guild.name);
    if (!intToLogEvents(config.logSubscribedEvents).includes('guildBanAdd')) return;

    const auditEvent = await getLatestAuditEvent(guild);

    const embed = new Embed({
      author: {
        iconURL: user.displayAvatarURL({ format: 'png' }) ?? undefined,
        name: user.tag,
      },
      color: logColorFor('guildBanAdd'),
      title: 'User banned',
    })
      .addField('User ID', user.id)
      .addField('Banned by', auditEvent.executor)
      .setThumbnail(user.displayAvatarURL({ format: 'png' }))
      .setTimestamp();

    auditEvent.reason && embed.addField('Reason', `"${auditEvent.reason.trim()}"`);

    logChannel.send(embed);
  },
  onGuildBanRemove: async (guild: Guild, user: User) => {
    const config = await getConfig(guild);
    if (!config.logChannelId) return;
    const logChannel = client.channels.cache.get(config.logChannelId) as TextChannel;
    if (!logChannel) console.warn('could not get log channel for ' + guild.name);
    if (!intToLogEvents(config.logSubscribedEvents).includes('guildBanRemove')) return;

    const auditEvent = await getLatestAuditEvent(guild);

    const embed = new Embed({
      author: {
        iconURL: user.displayAvatarURL({ format: 'png' }) ?? undefined,
        name: user.tag,
      },
      color: logColorFor('guildBanRemove'),
      title: 'User unbanned',
    })
      .addField('User ID', user.id)
      .addField('Unbanned by', auditEvent.executor)
      .setThumbnail(user.displayAvatarURL({ format: 'png' }))
      .setTimestamp();

    logChannel.send(embed);
  },
};
