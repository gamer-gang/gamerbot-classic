import { Guild, GuildMember, Invite, PartialRoleData, TextChannel, User } from 'discord.js';
import fse from 'fs-extra';
import { DateTime } from 'luxon';
import { LogHandlers } from '.';
import { CachedInvite, client, usernameCache } from '../../providers';
import { Embed, getDateFromSnowflake, resolvePath } from '../../util';
import { formatValue, getLatestAuditEvent, logColorFor } from './utils';

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
        .addField('Accout creation', getDateFromSnowflake(member.id).join(', '))
        .setThumbnail(member.user.displayAvatarURL({ format: 'png' }))
        .setTimestamp();

      if (usedCached)
        embed.addField(
          'Invite used',
          `${usedCached?.code} (created by ${
            client.users.resolve(usedCached?.creatorId ?? '') ?? usedCached?.creatorTag
          } ${DateTime.fromMillis(
            usedNew?.createdTimestamp as number
          ).toRelative()}, expires ${DateTime.fromMillis(
            usedNew?.expiresTimestamp as number
          ).toRelative()})`
        );
      else if (!member.user.bot)
        embed.setDescription(
          'No invite candidate could be found. This happens with single-use invites ' +
            '(which are deleted on use) or if you did not grant gamerbot permission to access ' +
            'invites. If you enabled the `inviteCreate` and/or `inviteDelete` log events, you ' +
            'can check the surrounding log events to find which invite was used.'
        );

      logChannel.send(embed);
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
      auditEvent.action === 'MEMBER_KICK' &&
      auditEvent.targetType === 'USER' &&
      (auditEvent.target as User).id === member.id
    ) {
      // kicked
      if (kicks.has(auditEvent.id)) return;
      saveKick(auditEvent.id);
      embed.setTitle('User kicked').addField('Kicked by', auditEvent.executor);
      auditEvent.reason && embed.addField('Reason', `"${auditEvent.reason}"`);
    } else {
      // leave
      embed.setTitle('User left');
    }

    logChannel.send(embed);
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

      if (!usernameCache.has(next.id))
        usernameCache.set(next.id, {
          username: next.user.username,
          discriminator: next.user.discriminator,
        });

      const cached = usernameCache.get(next.id)!;

      if (cached.username !== next.user.username)
        add('Username', cached.username, next.user.username);
      if (cached.discriminator !== next.user.discriminator)
        add('Discriminator', cached.discriminator, next.user.discriminator);

      const auditEvent = await getLatestAuditEvent(guild);

      if (prev.nickname !== next.nickname) {
        add('nickname', prev.nickname, next.nickname);

        if (
          auditEvent.action === 'MEMBER_UPDATE' &&
          auditEvent.changes?.some(
            change =>
              change.key === 'nick' && change.new == next.nickname && change.old == prev.nickname
          )
        )
          embed.addField('Changed by', auditEvent.executor);
      }

      if (
        auditEvent.action === 'MEMBER_ROLE_UPDATE' &&
        auditEvent.targetType === 'USER' &&
        (auditEvent.target as User).id === next.user.id
      ) {
        auditEvent.changes?.forEach(change => {
          embed.addField(
            `Roles ${change.key === '$add' ? 'added' : 'removed'} (${change.new.length})`,
            (change.new as PartialRoleData[])
              .map(role => guild.roles.resolve(role.id!.toString()))
              .join(' ')
          );
        });

        embed.addField('Changed by', auditEvent.executor);
      }

      embed.fields.length && logChannel.send(embed);
    },
};
