import { RequestContext } from '@mikro-orm/core';
import { Guild, Invite, TextChannel } from 'discord.js';
import _ from 'lodash';
import { DateTime } from 'luxon';
import { intToLogEvents, LogHandlers } from '.';
import { client, getLogger, inviteCache, logger } from '../../providers';
import { Embed } from '../../util';
import { getConfig, getLatestAuditEvent, logColorFor } from './utils';

client.on('ready', () => {
  const inviteFetchers = client.guilds.cache.array().map(
    (guild, index) =>
      new Promise<void>(resolve =>
        setTimeout(async () => {
          try {
            const invites = (await guild.fetchInvites()).array();

            const trackedInvites: string[] = [];

            for (const invite of invites) {
              inviteCache.set(invite.code, {
                code: invite.code,
                creatorId: invite.inviter?.id,
                creatorTag: invite.inviter?.tag,
                guildId: guild.id,
                uses: invite.uses ?? 0,
              });

              trackedInvites.push(invite.code);
            }

            getLogger(`GUILD ${guild.id}`).info('successfully cached invites');

            resolve();
          } catch (err) {
            getLogger(`GUILD ${guild.id}`).error(`error caching invites\n${err.stack}`);
          }
        }, index * 2500)
      )
  );

  Promise.all(inviteFetchers).then(() => (RequestContext.getEntityManager() ?? client.em).flush());
});

export const inviteHandlers: LogHandlers = {
  onInviteCreate: async (invite: Invite) => {
    const guild = invite.guild as Guild;

    inviteCache.set(invite.code, {
      code: invite.code,
      creatorId: invite.inviter?.id,
      creatorTag: invite.inviter?.tag,
      guildId: guild.id,
      uses: invite.uses ?? 0,
    });

    const config = await getConfig(guild);
    if (!config.logChannelId) return;
    const logChannel = client.channels.cache.get(config.logChannelId) as TextChannel | undefined;
    if (!logChannel)
      return logger.error(
        'could not get log channel ' + config.logChannelId + ' for ' + guild.name
      );
    if (!intToLogEvents(config.logSubscribedEvents).includes('inviteCreate')) return;

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
      .addField('Max uses', invite.maxUses ? invite.maxUses : 'infinite')
      .addField(
        'Expiration',
        expiry
          ? `${expiry.toLocaleString(DateTime.DATETIME_FULL)}, ${expiry.toRelative()}`
          : 'never'
      )
      .addField('Created by', invite.inviter)
      .setTimestamp();

    logChannel.send(embed);
  },
  onInviteDelete: async (invite: Invite) => {
    const cached = _.clone(inviteCache.get(invite.code));
    inviteCache.delete(invite.code);

    const guild = invite.guild as Guild;
    const config = await getConfig(guild);
    if (!config.logChannelId) return;
    const logChannel = client.channels.cache.get(config.logChannelId) as TextChannel | undefined;
    if (!logChannel)
      return logger.error(
        'could not get log channel ' + config.logChannelId + ' for ' + guild.name
      );
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
      .addField('Created by', client.users.resolve(cached?.creatorId ?? '') ?? cached?.creatorTag)
      .addField('Deleted by', auditEvent.executor)
      .setTimestamp();

    logChannel.send(embed);

    inviteCache.delete(invite.code);
  },
};
