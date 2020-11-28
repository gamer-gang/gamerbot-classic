import argon2 from 'argon2';
import { Guild, GuildMember, Invite, TextChannel, User } from 'discord.js';
import fse from 'fs-extra';
import _ from 'lodash';
import moment from 'moment';
import { resolve } from 'path';

import { GuildInvite } from '../../entities/GuildInvite';
import { client } from '../../providers';
import { Embed, getDateFromSnowflake, resolvePath, Store } from '../../util';
import { intToLogEvents, LogHandlers } from './log';
import { getConfig, getLatestAuditEvent, logColorFor } from './utils';

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

export const guildMemberHandlers: LogHandlers = {
  onGuildMemberAdd: async (member: GuildMember) => {
    const guild = member.guild;
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
    const changes = _.omitBy(next, (v, k) => _.isEqual(v, prev[k as keyof GuildMember]));

    console.log(changes);
  },
};
