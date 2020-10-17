import { GuildEmoji, Message, User } from 'discord.js';
import emojiRegex from 'emoji-regex';
import yargsParser from 'yargs-parser';

import { Command, CommandDocs } from '..';
import { client } from '../..';
import { Embed } from '../../embed';
import { ReactionRole, RoleEmoji } from '../../entities/ReactionRole';
import { CmdArgs } from '../../types';

export class CommandRole implements Command {
  cmd = 'role';
  yargsSchema: yargsParser.Options = {
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
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args, em } = cmdArgs;

    if (!msg.guild?.members.resolve(msg.author as User)?.hasPermission('MANAGE_ROLES'))
      return msg.channel.send('you are missing `MANAGE_ROLES` permission');

    if (!msg.guild?.members.resolve(client.user?.id as string)?.hasPermission('MANAGE_ROLES'))
      return msg.channel.send('bot is missing `MANAGE_ROLES` permission');

    if (args.list) {
      const manager = await msg.guild.roles.fetch();
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
        ?.map(message => '```\n' + message + '\n```') as string[];

      for (const message of messages) await msg.channel.send(message);
      return;
    }

    if (args.length < 1)
      return msg.channel.send(`expected at least 1 arg \nusage: \`${this.docs[0].usage}\``);

    const embed = new Embed().setTitle('roles');
    let description = 'react with the emoji for a role:\n';
    const roles: RoleEmoji[] = [];

    args._.forEach((arg, i) => {
      const parts = arg.split(',');
      if (parts.length !== 2) return msg.channel.send(`syntax error in argument #${i}`);
      const roleId = parts[0].trim();
      let emoji: string | GuildEmoji = parts[1].trim();

      const role = msg.guild?.roles.resolve(roleId);
      if (!role) return msg.channel.send('could not resolve role ' + roleId);

      const authorHighestRole = msg.guild?.members.resolve(msg.author?.id as string)?.roles.highest;
      if (!authorHighestRole) return msg.channel.send('you need a role to use this command');
      if (role.comparePositionTo(authorHighestRole) >= 0)
        return msg.channel.send(`role \`${role.name}\` is higher than your own highest role`);

      if (/^<:.+:\d{18}>$/.test(emoji.toString())) {
        // custom emoji
        const customId = (emoji as string).replace(/<:.+:/g, '').replace(/>/g, '');
        emoji = msg.guild?.emojis.cache.find(e => e.id == customId) as GuildEmoji;
      } else {
        const exec = emojiRegex().exec(emoji.toString());
        // invalid emoji
        if (!exec || exec[0] !== emoji) return msg.channel.send('invalid emoji: ' + emoji);
        // valid emoji, nothing to do
      }

      description += `${emoji}: ${role}\n`;
      roles.push(
        em.create(RoleEmoji, {
          emoji: emoji instanceof GuildEmoji ? emoji.id : emoji,
          roleId: role.id,
        })
      );
    });

    if (roles.length === 0) return msg.channel.send('nothing to do');

    embed.setDescription(description);

    const embedMessage = await msg.channel.send(embed);

    // save message to db
    const collector = em.create(ReactionRole, {
      messageId: embedMessage.id,
      guildId: msg.guild?.id,
      roles: [],
    });
    em.populate(collector, 'roles');
    em.persist(collector);

    roles.forEach(role => {
      role.message = collector;
      embedMessage.react(role.emoji);
      em.populate(role, 'message');
      em.persist(role);
    });
  }
}
