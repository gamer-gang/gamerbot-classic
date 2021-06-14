import { Guild, Role, TextChannel } from 'discord.js';
import _ from 'lodash';
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
      .addField('Name', role.name)
      .addField('ID', role.id)
      .addField('Permissions', role.permissions.toArray().join(', ') || 'None')
      .setTimestamp();

    role.members.size &&
      embed.addField(
        `Assigned to (${role.members.size})`,
        role.members
          .array()
          .map(member => `${member.user}`)
          .join(' ')
      );

    embed.addField('Deleted by', executor);

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
      description: `${next.toString()}, ID ${next.id}`,
      color: next.color,
    }).setTimestamp();

    const add = (name: string, before: unknown, after: unknown) => {
      const changeValue = _.isEqual(before, after)
        ? `\`${formatValue(after)}\``
        : `\`${formatValue(before)} => ${formatValue(after)}\``;
      embed.addField(changeTable[name as keyof typeof changeTable] ?? name, changeValue);
    };

    const auditEvent = await getLatestAuditEvent(guild);
    let permissionCheckNeeded = false;

    if (
      auditEvent.action === 'ROLE_UPDATE' &&
      auditEvent.targetType === 'ROLE' &&
      (auditEvent.target as Role).id === next.id &&
      auditEvent.changes?.length
    ) {
      auditEvent.changes.forEach(change => {
        switch (change.key) {
          case 'color':
            if (change.old === prev.color && change.new === next.color)
              add('Color', prev.hexColor, next.hexColor);
            break;
          case 'permissions':
          case 'permissions_new':
            if (change.old == prev.permissions.bitfield && change.new == next.permissions.bitfield)
              permissionCheckNeeded = true;
            return;
          case 'hoist':
            if (change.old === prev.hoist && change.new === next.hoist)
              add('Hoisted', prev.hoist, next.hoist);
            break;
          case 'mentionable':
            if (change.old === prev.mentionable && change.new === next.mentionable)
              add('Mentionable', prev.mentionable, next.mentionable);
            break;
          case 'name':
            if (change.old === prev.name && change.old === next.name)
              add('Name', prev.name, next.name);
        }
      });

      permissionCheckNeeded || embed.addField('Updated by', auditEvent.executor);
    }

    if (permissionCheckNeeded) {
      const prevPerms = prev.permissions.toArray(true);
      const nextPerms = next.permissions.toArray(true);

      const added = nextPerms.filter(permission => !prevPerms.includes(permission));
      const removed = prevPerms.filter(permission => !nextPerms.includes(permission));

      added.length && embed.addField('Added permissions', added.join(', '));
      removed.length && embed.addField('Removed permissions', removed.join(', '));

      embed.addField('Updated by', auditEvent.executor);
    }

    // if (prev.position !== next.position) add('Position', prev.position, next.position);
    // if (prev.rawPosition !== next.rawPosition) add('Position', prev.rawPosition, next.rawPosition);

    embed.fields.length && logChannel.send(embed);
  },
};
