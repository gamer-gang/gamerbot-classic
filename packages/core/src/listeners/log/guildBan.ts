import { Guild, TextChannel, User } from 'discord.js';
import { LogHandlers } from '.';
import { Embed } from '../../util';
import { getLatestAuditEvent, logColorFor } from './utils';

export const guildBanHandlers: LogHandlers = {
  onGuildBanAdd: (guild: Guild, logChannel: TextChannel) => async (guild: Guild, user: User) => {
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
  onGuildBanRemove: (guild: Guild, logChannel: TextChannel) => async (guild: Guild, user: User) => {
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
