import { GuildMember, Invite, TextChannel, User } from 'discord.js';
import fse from 'fs-extra';
import _ from 'lodash';
import moment from 'moment';
import { intToLogEvents, LogHandlers } from '.';
import { CachedInvite, client, getLogger, inviteCache } from '../../providers';
import { Embed, getDateFromSnowflake, resolvePath } from '../../util';
import { formatValue, getConfig, getLatestAuditEvent, logColorFor } from './utils';

fse.ensureFileSync(resolvePath('data/kicks.txt'));

const kicks = new Set<string>(
  fse
    .readFileSync(resolvePath('data/kicks.txt'), 'utf-8')
    .toString()
    .split('\n')
    .map(line => line.trim())
    // ignore lines with not IDs
    .filter(id => /^\d{18}$/.test(id))
);

const saveKick = (id: string) => {
  kicks.add(id);
  return fse.writeFile(
    resolvePath('data/kicks.txt'),
    'List of recorded kicks. Edits are not saved.\n\n' + Array.from(kicks.values()).join('\n')
  );
};

const changeTable: Partial<Record<keyof GuildMember, string>> = {
  nickname: 'Nickname',
  toString: '',
  valueOf: '',
};

export const guildMemberHandlers: LogHandlers = {
  onGuildMemberAdd: async (member: GuildMember) => {
    const guild = member.guild;

    // figure out which invite was just used
    const newInvites = (await guild.fetchInvites()).array();

    let usedCached: CachedInvite | undefined;
    let usedNew: Invite | undefined;

    for (const invite of newInvites) {
      const cached = inviteCache.get(invite.code);
      if (!cached) {
        getLogger(`GUILD ${guild.id}`).warn(`invite ${invite.code} has no cached counterpart`);
        continue;
      }
      if ((invite.uses ?? 0) > cached.uses) {
        cached.uses++;
        usedCached = cached;
        usedNew = invite;
        break;
      }
    }

    const config = await getConfig(guild);
    if (!config.logChannelId) return;
    const logChannel = client.channels.cache.get(config.logChannelId) as TextChannel;
    if (!logChannel) console.warn('could not get log channel for ' + guild.name);
    if (!intToLogEvents(config.logSubscribedEvents).includes('guildMemberAdd')) return;

    const embed = new Embed({
      author: {
        iconURL: member.user.displayAvatarURL({ format: 'png' }) ?? undefined,
        name: member.user.tag,
      },
      color: logColorFor('guildMemberAdd'),
      title: 'User joined',
    })
      .addField('User ID', member.id)
      .addField('Accout creation', getDateFromSnowflake(member.id).join(', '))
      .setThumbnail(member.user.displayAvatarURL({ format: 'png' }))
      .setTimestamp();

    if (usedCached)
      embed.addField(
        'Invite used',
        `${usedCached?.code} (created by ${
          client.users.resolve(usedCached?.creatorId ?? '') ?? usedCached?.creatorTag
        } ${moment(usedNew?.createdTimestamp).fromNow()}, expires ${moment(
          usedNew?.expiresTimestamp
        ).fromNow()})`
      );
    else
      embed.setDescription(
        'No invite candidate could be found. This happens with bots, single-use invites, ' +
          'which are deleted on use, or if you did not grant gamerbot permission to receive ' +
          'invites. If you enabled the `inviteCreate` and/or `inviteDelete` log events, you ' +
          'can check the surrounding log events to find which invite was used.'
      );

    logChannel.send(embed);
  },
  onGuildMemberRemove: async (member: GuildMember) => {
    const guild = member.guild;
    const config = await getConfig(guild);
    if (!config.logChannelId) return;
    const logChannel = client.channels.cache.get(config.logChannelId) as TextChannel;
    if (!logChannel) console.warn('could not get log channel for ' + guild.name);
    if (!intToLogEvents(config.logSubscribedEvents).includes('guildMemberRemove')) return;

    const auditEvent = await getLatestAuditEvent(guild);

    const embed = new Embed({
      author: {
        iconURL: member.user.displayAvatarURL({ format: 'png' }) ?? undefined,
        name: member.user.tag,
      },
      color: logColorFor('guildMemberRemove'),
    })
      .addField('User ID', member.id)
      .setThumbnail(member.user.displayAvatarURL({ format: 'png' }))
      .setTimestamp();

    if (
      !kicks.has(auditEvent.id) &&
      auditEvent.action === 'MEMBER_KICK' &&
      auditEvent.targetType === 'USER' &&
      (auditEvent.target as User).id === member.id
    ) {
      // kicked
      saveKick(auditEvent.id);
      embed.setTitle('User kicked').addField('Kicked by', auditEvent.executor);
      auditEvent.reason && embed.addField('Reason', `"${auditEvent.reason}"`);
    } else {
      // leave
      embed.setTitle('User left');
    }

    logChannel.send(embed);
  },
  onGuildMemberUpdate: async (prev: GuildMember, next: GuildMember) => {
    const guild = next.guild;
    const config = await getConfig(guild);
    if (!config.logChannelId) return;
    const logChannel = client.channels.cache.get(config.logChannelId) as TextChannel;
    if (!logChannel) console.warn('could not get log channel for ' + guild.name);
    if (!intToLogEvents(config.logSubscribedEvents).includes('guildMemberRemove')) return;

    const changes = _.omitBy(next, (v, k) => _.isEqual(v, prev[k as keyof GuildMember]));

    const embed = new Embed({
      title: 'Member updated',
      author: {
        iconURL: next.user.displayAvatarURL({ format: 'png' }) ?? undefined,
        name: next.user.tag,
      },
      color: logColorFor('guildMemberAdd'),
    })
      .setThumbnail(next.user.displayAvatarURL({ format: 'png' }))
      .setTimestamp();

    const add = (name: string, before: unknown, after: unknown) =>
      embed.addField(
        changeTable[name as keyof typeof changeTable] ?? name,
        `\`${formatValue(before)} => ${formatValue(after)}\``
      );

    if (changes.nickname) add('nickname', prev.nickname, next.nickname);

    embed.fields.length && logChannel.send(embed);
  },
};