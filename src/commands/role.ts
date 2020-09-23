import { GuildEmoji, Message, MessageReaction, PartialUser, Role, User } from 'discord.js';
import emojiRegex from 'emoji-regex';

import { Command } from '.';
import { client } from '..';
import { Embed } from '../embed';
import { ReactionRole, RoleEmoji } from '../entities/ReactionRole';
import { CmdArgs } from '../types';
import { hasFlags } from '../util';

export class CommandRole implements Command {
  cmd = 'role';
  docs = [
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
    const { msg, args, em, flags } = cmdArgs;

    if (!msg.guild?.members.resolve(msg.author as User)?.hasPermission('MANAGE_ROLES'))
      return msg.channel.send('missing `MANAGE_ROLES` permission');

    if (hasFlags(flags, ['-l'])) {
      const manager = await msg.guild.roles.fetch();
      const roles = manager.cache.filter(r => r.id !== manager.everyone.id);

      const ids = roles.map(r => r.id);
      let rows = roles.map(r => `${r.name}:`);

      const nameWidth = Math.max(...rows.map(r => r.length));
      rows = rows.map(
        (r, i) => r + ' '.repeat(nameWidth + (8 - (nameWidth % 8)) - r.length) + ids[i]
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

    args.forEach((arg, i) => {
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

      if (/^<:.+:\d{18}>$/.test(emoji)) {
        // custom emoji
        const customId = (emoji as string).replace(/<:.+:/g, '').replace(/>/g, '');
        console.log(customId);
        emoji = msg.guild?.emojis.cache.find(e => e.id == customId) as GuildEmoji;
      } else {
        const exec = emojiRegex().exec(emoji);
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

const verifyReaction = async (
  reaction: MessageReaction,
  user: User | PartialUser
): Promise<boolean> => {
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (err) {
      console.error('Something went wrong when fetching the message: ', err);

      (await user.createDM()).send(
        new Embed()
          .setTitle('error modifying roles in ' + reaction.message.guild?.name)
          .setDescription(
            `\`\`\`\n${err}\n\`\`\`\n` +
              'please contact wiisportsresorts#9388 or a server admin for help.'
          )
      );

      return false;
    }
  }

  return true;
};

const roleError = async ({
  reaction,
  user,
  collector,
}: {
  reaction: MessageReaction;
  user: User | PartialUser;
  collector: RoleEmoji;
  role: Role | null | undefined;
}) => {
  (await user.createDM()).send(
    new Embed()
      .setTitle('error modifying roles in ' + reaction.message.guild?.name)
      .setDescription(
        `\`\`\`\nrole id of ${collector.roleId} could not be resolved\n\`\`\`\n` +
          'please contact wiisportsresorts#9388 or a server admin for help.'
      )
  );
};

export const onMessageReactionAdd = (em: CmdArgs['em']) => async (
  reaction: MessageReaction,
  user: User | PartialUser
): Promise<unknown> => {
  if (user.id === client.user?.id) return;
  if (!(await verifyReaction(reaction, user))) return;
  const { message: msg } = reaction;

  const collectorMessage = await em.findOne(ReactionRole, { messageId: msg.id });
  if (!collectorMessage) return;

  const collector = (await collectorMessage.roles.loadItems()).find(
    e => e.emoji === reaction.emoji.toString()
  );
  if (!collector) return;

  const role = msg.guild?.roles.resolve(collector.roleId);
  if (!role) return roleError({ reaction, user, collector, role });

  await msg.guild?.members.resolve(user.id)?.roles.add(role);
  (await user.createDM()).send(
    new Embed()
      .setTitle(`received role \`${role.name}\` in ${msg.guild?.name}!`)
      .setDescription('remove the reaction from the message to remove this role.')
  );
};

export const onMessageReactionRemove = (em: CmdArgs['em']) => async (
  reaction: MessageReaction,
  user: User | PartialUser
): Promise<unknown> => {
  if (user.id === client.user?.id) return;
  if (!(await verifyReaction(reaction, user))) return;
  const { message: msg } = reaction;

  const collectorMessage = await em.findOne(ReactionRole, { messageId: msg.id });
  if (!collectorMessage) return;

  const collector = (await collectorMessage.roles.loadItems()).find(
    e => e.emoji === reaction.emoji.toString()
  );
  if (!collector) return;

  const role = msg.guild?.roles.resolve(collector.roleId);
  if (!role) return roleError({ reaction, user, collector, role });

  await msg.guild?.members.resolve(user.id)?.roles.remove(role);
  (await user.createDM()).send(
    new Embed()
      .setTitle(`removed role \`${role.name}\` in ${msg.guild?.name}!`)
      .setDescription('react to the message again to get the role back.')
  );
};
