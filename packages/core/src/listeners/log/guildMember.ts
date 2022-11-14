import { Embed, getDateStringFromSnowflake } from '@gamerbot/util';
import {
  Guild,
  GuildMember,
  Invite,
  PartialRoleData,
  Snowflake,
  TextChannel,
  User,
} from 'discord.js';
import { DateTime } from 'luxon';
import { CachedInvite } from '../../gamerbot';
import { client } from '../../providers';
import { formatValue, getLatestAuditEvent, logColorFor } from './utils';
import { LogHandlers } from './_constants';

const kicks = new Set<string>();

const saveKick = (id: string) => {
  kicks.add(id);
  // return fse.writeFile(
  //   resolvePath('data/kicks.txt'),
  //   'List of recorded kicks. Edits are not saved.\n\n' + Array.from(kicks.values()).join('\n')
  // );
};

const changeTable = {
  nickname: 'Nickname',
  toString: '',
  valueOf: '',
};

export const guildMemberHandlers: LogHandlers = {
  onGuildMemberAdd:
    (
      guild: Guild,
      logChannel: TextChannel,
      info?: { usedCached?: CachedInvite; usedNew?: Invite }
    ) =>
    async (member: GuildMember) => {
      const { usedCached, usedNew } = info!;
      const embed = new Embed({
        author: {
          iconURL: member.user.displayAvatarURL({ format: 'png' }) ?? undefined,
          name: member.user.tag,
        },
        color: logColorFor('guildMemberAdd'),
        title: 'User joined',
        description: member.toString(),
      })
        .addField('User ID', member.id)
        .addField('Accout creation', getDateStringFromSnowflake(member.id).join(', '))
        .setThumbnail(member.user.displayAvatarURL({ format: 'png' }))
        .setTimestamp();

      if (usedCached)
        embed.addField(
          'Invite used',
          `${usedCached?.code} (created by ${
            client.users.resolve(usedCached?.creatorId ?? '') ?? usedCached?.creatorTag
          } ${DateTime.fromMillis(usedNew?.createdTimestamp as number).toRelative()}${
            usedNew?.expiresTimestamp
              ? `, expires ${DateTime.fromMillis(
                  usedNew?.expiresTimestamp as number
                ).toRelative()})`
              : ''
          }`
        );
      else if (!member.user.bot)
        embed.setDescription(
          'No invite candidate could be found. This happens with single-use invites ' +
            '(which are deleted on use) or if you did not grant gamerbot permission to access ' +
            'invites. If you enabled the `inviteCreate` and/or `inviteDelete` log events, you ' +
            'can check the surrounding log events to find which invite was used.'
        );

      embed.send(logChannel);
    },
  onGuildMemberRemove: (guild: Guild, logChannel: TextChannel) => async (member: GuildMember) => {
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
      // @ts-ignore yup
      auditEvent.action === 'MEMBER_KICK' &&
      // @ts-ignore yup
      auditEvent.targetType === 'USER' &&
      (auditEvent.target as User).id === member.id
    ) {
      // kicked
      if (kicks.has(auditEvent.id)) return;
      saveKick(auditEvent.id);
      embed.setTitle('User kicked');

      auditEvent.executor && embed.addField('Kicked by', auditEvent.executor.toString());
      auditEvent.reason && embed.addField('Reason', `"${auditEvent.reason}"`);
    } else {
      // leave
      embed.setTitle('User left');
    }

    embed.send(logChannel);
  },
  onGuildMemberUpdate:
    (guild: Guild, logChannel: TextChannel) => async (prev: GuildMember, next: GuildMember) => {
      const embed = new Embed({
        title: 'Member updated',
        author: {
          iconURL: next.user.displayAvatarURL({ format: 'png' }) ?? undefined,
          name: next.user.tag,
        },
        description: next.toString(),
        color: logColorFor('guildMemberUpdate'),
      })
        .setThumbnail(next.user.displayAvatarURL({ format: 'png' }))
        .setTimestamp();

      const add = (name: string, before: unknown, after: unknown) =>
        embed.addField(
          changeTable[name as keyof typeof changeTable] ?? name,
          `\`${formatValue(before)} => ${formatValue(after)}\``
        );

      if (!client.usernameCache.has(next.id))
        client.usernameCache.set(next.id, {
          username: next.user.username,
          discriminator: next.user.discriminator,
        });

      const cached = client.usernameCache.get(next.id)!;

      if (cached.username !== next.user.username)
        add('Username', cached.username, next.user.username);
      if (cached.discriminator !== next.user.discriminator)
        add('Discriminator', cached.discriminator, next.user.discriminator);

      const auditEvent = await getLatestAuditEvent(guild);

      if (prev.nickname !== next.nickname) {
        add('nickname', prev.nickname, next.nickname);

        if (
          // @ts-ignore yup
          auditEvent.action === 'MEMBER_UPDATE' &&
          auditEvent.changes?.some(
            change =>
              change.key === 'nick' && change.new == next.nickname && change.old == prev.nickname
          )
        )
          auditEvent.executor && embed.addField('Changed by', auditEvent.executor.toString());
      }

      if (
        // @ts-ignore yup
        auditEvent.action === 'MEMBER_ROLE_UPDATE' &&
        // @ts-ignore yup
        auditEvent.targetType === 'USER' &&
        (auditEvent.target as User).id === next.user.id
      ) {
        auditEvent.changes?.forEach(change => {
          embed.addField(
            `Roles ${change.key === '$add' ? 'added' : 'removed'} (${
              (change.new as PartialRoleData[]).length
            })`,
            (change.new as PartialRoleData[])
              .map(role => guild.roles.resolve(role.id!.toString() as Snowflake))
              .join(' ')
          );
        });

        auditEvent.executor && embed.addField('Changed by', auditEvent.executor.toString());
      }

      embed.fields.length && embed.send(logChannel);
    },
};
