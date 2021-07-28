import { delay, Embed } from '@gamerbot/util';
import { Guild, Invite, Snowflake, TextChannel } from 'discord.js';
import { getLogger } from 'log4js';
import { DateTime } from 'luxon';
import { CachedInvite } from '../../gamerbot';
import { client, getORM } from '../../providers';
import { getLatestAuditEvent, logColorFor } from './utils';
import { LogHandlers } from './_constants';

const fetchInvite = async (guild: Guild) => {
  try {
    const invites = (await guild.invites.fetch()).array();

    const trackedInvites: string[] = [];

    for (const invite of invites) {
      client.inviteCache.set(invite.code, {
        code: invite.code,
        creatorId: invite.inviter!.id,
        creatorTag: invite.inviter!.tag,
        guildId: guild.id,
        uses: invite.uses ?? 0,
      });

      trackedInvites.push(invite.code);
    }

    getLogger(`fetchInvite[guild=${guild.id}]`).debug('successfully cached invites');

    return;
  } catch (err) {
    getLogger(`fetchInvite[guild=${guild.id}]`).error(`error caching invites: ${err.message}`);
  }
};

client.on('ready', async () => {
  const orm = await getORM();

  const inviteFetchers = client.guilds.cache
    .array()
    .map((guild, index) => delay(index * 2500)(undefined).then(() => fetchInvite(guild)));

  Promise.all(inviteFetchers).then(() => orm.em.flush());
});

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
