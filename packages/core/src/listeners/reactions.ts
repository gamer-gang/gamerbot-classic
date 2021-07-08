import { Embed } from '@gamerbot/util';
import { Message, MessageReaction, PartialMessage, PartialUser, User } from 'discord.js';
import { ReactionRole, RoleEmoji } from '../entities/ReactionRole';
import { client, getLogger, orm } from '../providers';

const verifyReaction = async (
  reaction: MessageReaction,
  user: User | PartialUser
): Promise<boolean> => {
  if (!reaction.partial) return true;

  try {
    await reaction.fetch();
    return true;
  } catch (err) {
    getLogger(`REACTION ON ${reaction.message.id}`).error('fetch error message: ', err);

    const dm = await user.createDM();
    Embed.error(
      'error modifying roles in ' + reaction.message.guild?.name,
      `\`\`\`\n${err}\n\`\`\`\n` +
        'please contact wiisportsresorts#2444 or a server admin for help.'
    ).send(dm);

    return false;
  }
};

const roleError = async ({
  reaction,
  user,
  collector,
}: {
  reaction: MessageReaction;
  user: User | PartialUser;
  collector: RoleEmoji;
}) => {
  Embed.error(
    'error modifying roles in ' + reaction.message.guild?.name,
    `\`\`\`\nrole id of ${collector.roleId} could not be resolved\n\`\`\`\n` +
      'please contact wiisportsresorts#9388 or a server admin for help.'
  ).send(await user.createDM());
};

const getCollector = async ({
  msg,
  reaction,
}: {
  msg: Message | PartialMessage;
  reaction: MessageReaction;
}) => {
  const collectorMessage = await orm.em.findOne(ReactionRole, { messageId: msg.id });
  if (!collectorMessage) return;

  const items = await collectorMessage.roles.loadItems();
  return items.find(e => e.emoji === reaction.emoji.toString() || e.emoji === reaction.emoji.id);
};

const missingPermissions = async ({
  msg,
  user,
}: {
  msg: Message | PartialMessage;
  user: User | PartialUser;
}) => {
  if (msg.guild?.me?.permissions.has('MANAGE_ROLES')) return true;

  Embed.error(
    user +
      ": i can't modify your roles because the bot is missing the `MANAGE_ROLES` " +
      'permission. please contact a server admin for help.'
  ).send(await user.createDM());
  return false;
};

export const onMessageReactionAdd = async (
  reaction: MessageReaction,
  user: User | PartialUser
): Promise<unknown> => {
  const { message: msg } = reaction;
  if (user.id === client.user?.id) return;
  if (!(await verifyReaction(reaction, user))) return;

  const collector = await getCollector({ msg, reaction });
  if (!collector) return;

  if (!missingPermissions({ msg, user })) return;

  const role = msg.guild?.roles.resolve(collector.roleId);
  if (!role) return roleError({ reaction, user, collector });

  await msg.guild?.members.resolve(user.id)?.roles.add(role);

  Embed.success(
    `received role \`${role.name}\` in ${msg.guild?.name}!`,
    'remove the reaction from the message to remove this role.'
  ).send(await user.createDM());
};

export const onMessageReactionRemove = async (
  reaction: MessageReaction,
  user: User | PartialUser
): Promise<unknown> => {
  const { message: msg } = reaction;
  if (user.id === client.user?.id) return;
  if (!(await verifyReaction(reaction, user))) return;

  const collector = await getCollector({ msg, reaction });
  if (!collector) return;

  if (!missingPermissions({ msg, user })) return;

  const role = msg.guild?.roles.resolve(collector.roleId);
  if (!role) return roleError({ reaction, user, collector });

  await msg.guild?.members.resolve(user.id)?.roles.remove(role);

  Embed.success(
    `removed role \`${role.name}\` in ${msg.guild?.name}!`,
    'react to the message again to get the role back.'
  ).send(await user.createDM());
};
