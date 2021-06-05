import { Guild, Role, TextChannel } from 'discord.js';
import { LogHandlers } from '.';
import { Embed } from '../../util';
import { formatValue, getLatestAuditEvent } from './utils';

const changeTable = {
  nickname: 'Nickname',
  toString: '',
  valueOf: '',
};

export const roleHandlers: LogHandlers = {
  onRoleCreate: (guild: Guild, logChannel: TextChannel) => async (role: Role) => {
    const auditEvent = await getLatestAuditEvent(guild);

    const executor = guild.members.resolve(auditEvent.executor)!;

    let icon = guild.iconURL({ dynamic: true, size: 4096 });
    if (icon?.includes('.webp')) icon = guild.iconURL({ format: 'png', size: 4096 });

    const embed = new Embed({
      author: {
        iconURL: icon ?? undefined,
        name: guild.name,
      },
      color: role.color,
      title: 'Role created',
      description: role.toString(),
    })
      .addField('ID', role.id)
      .addField('Color', role.hexColor)
      .addField('Created by', executor)
      .setTimestamp();

    logChannel.send(embed);
  },
  onRoleDelete: (guild: Guild, logChannel: TextChannel) => async (role: Role) => {
    const auditEvent = await getLatestAuditEvent(guild);

    const executor = guild.members.resolve(auditEvent.executor)!;

    let icon = guild.iconURL({ dynamic: true, size: 512 });
    if (icon?.includes('.webp')) icon = guild.iconURL({ format: 'png', size: 4096 });

    const embed = new Embed({
      author: {
        iconURL: icon ?? undefined,
        name: guild.name,
      },
      color: role.color,
      title: 'Role deleted',
    })
      .addField('ID', role.id)
      .addField('Deleted by', executor)
      .setTimestamp();

    role.members.size &&
      embed.addField(
        `Assigned to (${role.members.size})`,
        role.members
          .array()
          .map(member => member.user.toString())
          .join(' ')
      );

    logChannel.send(embed);
  },
  onRoleUpdate: (guild: Guild, logChannel: TextChannel) => async (prev: Role, next: Role) => {
    let icon = guild.iconURL({ dynamic: true, size: 512 });
    if (icon?.includes('.webp')) icon = guild.iconURL({ format: 'png', size: 4096 });

    const embed = new Embed({
      title: 'Role updated',
      author: {
        iconURL: icon ?? undefined,
        name: guild.name,
      },
      description: next.toString(),
      color: next.color,
    })
      .addField('ID', next.id)
      .setTimestamp();

    const add = (name: string, before: unknown, after: unknown) =>
      embed.addField(
        changeTable[name as keyof typeof changeTable] ?? name,
        `\`${formatValue(before)} => ${formatValue(after)}\``
      );

    const auditEvent = await getLatestAuditEvent(guild);

    if (
      auditEvent.action === 'ROLE_UPDATE' &&
      auditEvent.targetType === 'ROLE' &&
      (auditEvent.target as Role).id === next.id &&
      auditEvent.changes?.length &&
      auditEvent.changes.every(change => {
        switch (change.key) {
          case 'color':
            return change.old === prev.color && change.new === next.color;
          case 'permissions':
            return (
              change.old == prev.permissions.bitfield && change.new == next.permissions.bitfield
            );
          case 'permissions_new':
            return (
              change.old == prev.permissions.bitfield && change.new == next.permissions.bitfield
            );
          case 'hoist':
            return change.old === prev.hoist && change.new === next.hoist;
          case 'mentionable':
            return change.old === prev.mentionable && change.new === next.mentionable;
          case 'name':
            return change.old === prev.name && change.old === next.name;
        }
      })
    )
      embed.addField('Updated by', auditEvent.executor);

    if (!prev.permissions.equals(next.permissions)) {
      const prevPerms = prev.permissions.toArray(true);
      const nextPerms = next.permissions.toArray(true);

      const added = nextPerms.filter(permission => !prevPerms.includes(permission));
      const removed = prevPerms.filter(permission => !nextPerms.includes(permission));

      added.length && embed.addField('Added permissions', added.join(', '));
      removed.length && embed.addField('Removed permissions', removed.join(', '));
    }

    if (prev.name !== next.name) add('Name', prev.name, next.name);
    if (prev.color !== next.color) add('Color', `#${prev.hexColor}`, `#${next.name}`);
    if (prev.hoist !== next.hoist) add('Hoisted', prev.hoist, next.hoist);
    if (prev.mentionable !== next.mentionable)
      add('Mentionable', prev.mentionable, next.mentionable);

    // if (prev.position !== next.position) add('Position', prev.position, next.position);
    if (prev.rawPosition !== next.rawPosition) add('Position', prev.rawPosition, next.rawPosition);

    embed.fields.length && logChannel.send(embed);
  },
};
