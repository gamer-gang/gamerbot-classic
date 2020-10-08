import { MessageReaction, PartialUser, Role, User } from 'discord.js';

import { client } from '..';
import { Embed } from '../embed';
import { ReactionRole, RoleEmoji } from '../entities/ReactionRole';
import { CmdArgs } from '../types';

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
    e => e.emoji === reaction.emoji.toString() || e.emoji === reaction.emoji.id
  );
  if (!collector) return;

  if (!msg.guild?.members.resolve(client.user?.id as string)?.hasPermission('MANAGE_ROLES')) {
    msg.channel.send(
      `${user}: can't give you that role as the bot is missing the \`MANAGE_ROLES\` permission. ` +
        `please contact a server admin for help.`
    );
  }

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
    e => e.emoji === reaction.emoji.toString() || e.emoji === reaction.emoji.id
  );
  if (!collector) return;

  if (!msg.guild?.members.resolve(client.user?.id as string)?.hasPermission('MANAGE_ROLES')) {
    msg.channel.send(
      `${user}: can't remove that role as the bot is missing the \`MANAGE_ROLES\` permission. ` +
        `please contact a server admin for help.`
    );
  }

  const role = msg.guild?.roles.resolve(collector.roleId);
  if (!role) return roleError({ reaction, user, collector, role });

  await msg.guild?.members.resolve(user.id)?.roles.remove(role);
  (await user.createDM()).send(
    new Embed()
      .setTitle(`removed role \`${role.name}\` in ${msg.guild?.name}!`)
      .setDescription('react to the message again to get the role back.')
  );
};
