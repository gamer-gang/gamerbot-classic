import { Embed } from '@gamerbot/util';
import { Guild, Invite, Snowflake, TextChannel } from 'discord.js';
import { DateTime } from 'luxon';
import { CachedInvite } from '../../gamerbot';
import { client } from '../../providers';
import { getLatestAuditEvent, logColorFor } from './utils';
import { LogHandlers } from './_constants';

export const inviteHandlers: LogHandlers = {
  onInviteCreate: (guild: Guild, logChannel: TextChannel) => async (invite: Invite) => {
    const expiry = invite.expiresAt && DateTime.fromJSDate(invite.expiresAt);

    const embed = new Embed({
      author: {
        iconURL: guild.iconURL({ format: 'png' }) ?? undefined,
        name: guild.name,
      },
      color: logColorFor('inviteCreate'),
      title: 'Invite created',
    })
      .addField('Code', invite.code)
      .addField('Max uses', invite.maxUses ? invite.maxUses.toString() : 'infinite')
      .addField(
        'Expiration',
        expiry
          ? `${expiry.toLocaleString(DateTime.DATETIME_FULL)}, ${expiry.toRelative()}`
          : 'never'
      )
      .setTimestamp();

    invite.inviter && embed.addField('Created by', invite.inviter.toString());

    embed.send(logChannel);
  },
  onInviteDelete:
    (guild: Guild, logChannel: TextChannel, cached: CachedInvite) => async (invite: Invite) => {
      const auditEvent = await getLatestAuditEvent(guild);

      const embed = new Embed({
        author: {
          iconURL: guild.iconURL({ format: 'png' }) ?? undefined,
          name: guild.name,
        },
        color: logColorFor('inviteDelete'),
        title: 'Invite deleted',
      })
        .addField('Code', invite.code)
        .addField(
          'Uses*',
          `${(invite.uses || cached?.uses) ?? 0}${
            invite.maxUses ? '/' + invite.maxUses : ''
          }\n*approximate.`
        )
        .addField(
          'Created by',
          client.users.resolve(cached?.creatorId ?? ('' as Snowflake))?.toString() ??
            cached.creatorTag
        )
        .setTimestamp();

      auditEvent.executor && embed.addField('Deleted by', auditEvent.executor.toString());

      embed.send(logChannel);

      client.inviteCache.delete(invite.code);
    },
};
