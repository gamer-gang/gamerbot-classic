import { Embed } from '@gamerbot/util';
import { Guild, TextChannel, User } from 'discord.js';
import { LogHandlers } from '.';
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
      .setThumbnail(user.displayAvatarURL({ format: 'png' }))
      .setTimestamp();

    auditEvent.executor && embed.addField('Banned by', auditEvent.executor.toString());
    auditEvent.reason && embed.addField('Reason', `"${auditEvent.reason.trim()}"`);

    embed.send(logChannel);
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
      .setThumbnail(user.displayAvatarURL({ format: 'png' }))
      .setTimestamp();

    auditEvent.executor && embed.addField('Unbanned by', auditEvent.executor.toString());

    embed.send(logChannel);
  },
};
