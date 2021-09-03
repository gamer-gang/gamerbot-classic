import { Embed } from '@gamerbot/util';
import { Guild, GuildBan, TextChannel } from 'discord.js';
import { getLatestAuditEvent, logColorFor } from './utils';
import { LogHandlers } from './_constants';

export const guildBanHandlers: LogHandlers = {
  onGuildBanAdd: (guild: Guild, logChannel: TextChannel) => async (ban: GuildBan) => {
    const auditEvent = await getLatestAuditEvent(guild);

    const embed = new Embed({
      author: {
        iconURL: ban.user.displayAvatarURL({ format: 'png' }) ?? undefined,
        name: ban.user.tag,
      },
      color: logColorFor('guildBanAdd'),
      title: 'User banned',
    })
      .addField('User ID', ban.user.id)
      .setThumbnail(ban.user.displayAvatarURL({ format: 'png' }))
      .setTimestamp();

    auditEvent.executor && embed.addField('Banned by', auditEvent.executor.toString());
    auditEvent.reason && embed.addField('Reason', `"${auditEvent.reason.trim()}"`);

    embed.send(logChannel);
  },
  onGuildBanRemove: (guild: Guild, logChannel: TextChannel) => async (ban: GuildBan) => {
    const auditEvent = await getLatestAuditEvent(guild);

    const embed = new Embed({
      author: {
        iconURL: ban.user.displayAvatarURL({ format: 'png' }) ?? undefined,
        name: ban.user.tag,
      },
      color: logColorFor('guildBanRemove'),
      title: 'User unbanned',
    })
      .addField('User ID', ban.user.id)
      .setThumbnail(ban.user.displayAvatarURL({ format: 'png' }))
      .setTimestamp();

    auditEvent.executor && embed.addField('Unbanned by', auditEvent.executor.toString());

    embed.send(logChannel);
  },
};
