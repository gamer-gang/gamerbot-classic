import { Guild, Invite, TextChannel } from 'discord.js';
import moment from 'moment';

import { GuildInvite } from '../../entities/GuildInvite';
import { client } from '../../providers';
import { Embed } from '../../util';
import { intToLogEvents, LogHandlers } from './log';
import { getConfig, getLatestAuditEvent, logColorFor } from './utils';

client.on('ready', () => {
  const inviteFetchers = client.guilds.cache.array().map(
    (guild, index) =>
      new Promise<void>(resolve =>
        setTimeout(async () => {
          const invites = (await guild.fetchInvites()).array();

          const trackedInvites: string[] = [];

          for (const invite of invites) {
            const existing = await client.em.findOne(GuildInvite, { code: invite.code });
            if (existing) existing.uses = invite.uses ?? 0;
            else {
              const guildinvite = client.em.create(GuildInvite, {
                code: invite.code,
                creatorId: invite.inviter?.id,
                creatorTag: invite.inviter?.tag,
                guildId: guild.id,
                uses: invite.uses,
              });

              client.em.persist(guildinvite);
            }

            trackedInvites.push(invite.code);
          }

          const guildInvites = await client.em.find(GuildInvite, { guildId: guild.id });

          guildInvites
            .filter(cached => !trackedInvites.includes(cached.code))
            .forEach(old => client.em.remove(old));

          console.log(trackedInvites);
          console.log('successfully cached invites for ' + guild.name);

          resolve();
        }, index * 2500)
      )
  );

  Promise.all(inviteFetchers).then(() => client.em.flush());
});

export const inviteHandlers: LogHandlers = {
  onInviteCreate: async (invite: Invite) => {
    const guild = invite.guild as Guild;

    const guildinvite = client.em.create(GuildInvite, {
      code: invite.code,
      creatorId: invite.inviter?.id,
      creatorTag: invite.inviter?.tag,
      guildId: guild.id,
      uses: invite.uses,
    });

    client.em.persist(guildinvite);

    const config = await getConfig(guild);
    if (!config.logChannelId) return;
    const logChannel = client.channels.cache.get(config.logChannelId) as TextChannel;
    if (!logChannel) console.warn('could not get log channel for ' + guild.name);
    if (!intToLogEvents(config.logSubscribedEvents).includes('inviteCreate')) return;

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
        'Expires at',
        invite.expiresAt
          ? moment(invite.expiresAt).format('dddd, MMMM Do YYYY, h:mm:ss A')
          : 'never'
      )
      .addField('Created by', invite.inviter)
      .setTimestamp();

    logChannel.send(embed);
  },
  onInviteDelete: async (invite: Invite) => {
    const guild = invite.guild as Guild;

    const cached = await client.em.findOne(GuildInvite, { code: invite.code, guildId: guild.id });

    console.log(cached);

    const config = await getConfig(guild);
    if (!config.logChannelId) {
      cached && client.em.remove(cached);
      return;
    }
    const logChannel = client.channels.cache.get(config.logChannelId) as TextChannel;
    if (!logChannel) {
      cached && client.em.remove(cached);
      return console.warn('could not get log channel for ' + guild.name);
    }
    if (!intToLogEvents(config.logSubscribedEvents).includes('inviteDelete')) {
      cached && client.em.remove(cached);
      return;
    }

    const auditEvent = await getLatestAuditEvent(guild);

    console.log(cached);

    const embed = new Embed({
      author: {
        iconURL: guild.iconURL({ format: 'png' }) ?? undefined,
        name: guild.name,
      },
      color: logColorFor('inviteDelete'),
      title: 'Invite deleted',
    })
      .addField('Code', invite.code)
      .addField('Uses', cached?.uses)
      .addField('Created by', cached?.creatorTag)
      .addField('Deleted by', auditEvent.executor)
      .setTimestamp();

    logChannel.send(embed);

    cached && client.em.remove(cached);
  },
};
