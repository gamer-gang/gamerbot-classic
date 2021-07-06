import { GuildEmoji, Message, PermissionString, Snowflake, User } from 'discord.js';
import emojiRegex from 'emoji-regex';
import yargsParser from 'yargs-parser';
import { Command, CommandDocs } from '..';
import { ReactionRole, RoleEmoji } from '../../entities/ReactionRole';
import { client, orm } from '../../providers';
import { Context } from '../../types';
import { codeBlock, Embed } from '../../util';

export class CommandRole implements Command {
  cmd = 'role';
  yargs: yargsParser.Options = {
    array: ['role'],
    boolean: ['list'],
    alias: {
      list: 'l',
      role: 'r',
    },
    default: {
      list: false,
    },
  };
  docs: CommandDocs = [
    {
      usage: 'role <roleId>,<emoji> [...<roleId>,<emoji>]',
      description: 'create a role distributor given an emoji',
    },
    {
      usage: 'role -l',
      description: 'list the boyes',
    },
  ];
  userPermissions: PermissionString[] = ['MANAGE_ROLES'];
  botPermissions: PermissionString[] = ['MANAGE_ROLES'];
  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;

    if (!msg.guild?.members.resolve(msg.author as User)?.permissions.has('MANAGE_ROLES'))
      return Embed.error('you are missing the `MANAGE_ROLES` permission').reply(msg);

    if (!msg.guild?.members.resolve(client.user.id)?.permissions.has('MANAGE_ROLES'))
      return Embed.error('bot is missing `MANAGE_ROLES` permission').reply(msg);

    if (args.list) {
      await msg.guild.roles.fetch();
      const manager = msg.guild.roles;
      const roles = manager.cache.filter(r => r.id !== manager.everyone.id);

      const ids = roles.map(r => r.id);
      let rows = roles.map(r => `${r.name}:`);

      const nameWidth = Math.max(...rows.map(r => r.length));
      rows = rows.map(
        (r, i) => r + ' '.repeat(nameWidth + (3 - (nameWidth % 3)) - r.length) + ids[i]
      );

      const messages = rows
        .join('\n')
        .match(/(.|\n){1,1900}\n/g)
        ?.map(message => codeBlock(message)) as string[];

      for (const message of messages) await msg.channel.send(message);
      return;
    }

    // if (args._.length < 1)
    //   return msg.channel.send(
    //     Embed.error('expected at least 1 arg', `usage: \`${this.docs[0].usage}\``)
    //   );

    const embed = new Embed({ title: 'roles' }).setDefaultAuthor();
    let description = 'react with the emoji for a role:\n';
    const roles: RoleEmoji[] = [];

    args._.forEach((arg, i) => {
      const parts = arg.split(',');
      if (parts.length !== 2)
        return Embed.error(
          `syntax error in argument #${i}`,
          'format should be `roleId,:emoji:` (no spaces before/after comma)'
        ).reply(msg);

      const roleId = parts[0].trim() as Snowflake;
      let emoji: string | GuildEmoji = parts[1].trim();

      const role = msg.guild?.roles.resolve(roleId);
      if (!role) return Embed.error('could not resolve role ' + roleId).reply(msg);

      const authorHighestRole = msg.guild?.members.resolve(msg.author.id)?.roles.highest;
      if (!authorHighestRole) return Embed.error('you need a role to use this command').reply(msg);

      if (role.comparePositionTo(authorHighestRole) >= 0)
        return Embed.error(`role ${role} is higher than your highest role`).reply(msg);

      if (/^<:.+:\d{18}>$/.test(emoji.toString())) {
        // custom emoji
        const customId = (emoji as string).replace(/<:.+:/g, '').replace(/>/g, '');
        emoji = msg.guild?.emojis.cache.find(e => e.id == customId) as GuildEmoji;
      } else {
        const exec = emojiRegex().exec(emoji.toString());
        // invalid emoji
        if (!exec || exec[0] !== emoji) return Embed.error('invalid emoji: ' + emoji).reply(msg);
        // valid emoji, nothing to do
      }

      description += `${emoji}: ${role}\n`;
      roles.push(
        orm.em.create(RoleEmoji, {
          emoji: emoji instanceof GuildEmoji ? emoji.id : emoji,
          roleId: role.id,
        })
      );
    });

    if (roles.length === 0) return Embed.warning('nothing to do').reply(msg);

    embed.setDescription(description);

    const embedMessage = await embed.send(msg.channel);

    // save message to db
    const collector = orm.em.create(ReactionRole, {
      messageId: embedMessage.id,
      guildId: msg.guild?.id,
      roles: [],
    });
    orm.em.populate(collector, 'roles');
    orm.em.persist(collector);

    roles.forEach(role => {
      role.message = collector;
      embedMessage.react(role.emoji);
      orm.em.populate(role, 'message');
      orm.em.persist(role);
    });
  }
}
