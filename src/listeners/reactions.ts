import { Message, MessageReaction, PartialMessage, PartialUser, User } from 'discord.js';

import { ReactionRole, RoleEmoji } from '../entities/ReactionRole';
import { Gamerbot } from '../gamerbot';
import { client, getLogger } from '../providers';
import { Embed } from '../util';

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
    dm.send(
      new Embed({
        intent: 'error',
        title: 'error modifying roles in ' + reaction.message.guild?.name,
        description:
          `\`\`\`\n${err}\n\`\`\`\n` +
          'please contact wiisportsresorts#9388 or a server admin for help.',
      })
    );

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
  const dm = await user.createDM();
  dm.send(
    new Embed({
      intent: 'error',
      title: 'error modifying roles in ' + reaction.message.guild?.name,
      description:
        `\`\`\`\nrole id of ${collector.roleId} could not be resolved\n\`\`\`\n` +
        'please contact wiisportsresorts#9388 or a server admin for help.',
    })
  );
};

const getCollector = async ({
  em,
  msg,
  reaction,
}: {
  em: Gamerbot['em'];
  msg: Message | PartialMessage;
  reaction: MessageReaction;
}) => {
  const collectorMessage = await em.findOne(ReactionRole, { messageId: msg.id });
  if (!collectorMessage) return;

  const items = await collectorMessage.roles.loadItems();
  return items.find(e => e.emoji === reaction.emoji.toString() || e.emoji === reaction.emoji.id);
};

const missingPermissions = ({
  msg,
  user,
}: {
  msg: Message | PartialMessage;
  user: User | PartialUser;
}) => {
  if (msg.guild?.me?.hasPermission('MANAGE_ROLES')) return true;

  msg.channel.send(
    new Embed({
      intent: 'error',
      description:
        user +
        ": i can't modify your roles because the bot is missing the `MANAGE_ROLES` " +
        'permission. please contact a server admin for help.',
    })
  );
  return false;
};

export const onMessageReactionAdd = (em: Gamerbot['em']) => async (
  reaction: MessageReaction,
  user: User | PartialUser
): Promise<unknown> => {
  const { message: msg } = reaction;
  if (user.id === client.user?.id) return;
  if (!(await verifyReaction(reaction, user))) return;

  const collector = await getCollector({ em, msg, reaction });
  if (!collector) return;

  if (!missingPermissions({ msg, user })) return;

  const role = msg.guild?.roles.resolve(collector.roleId);
  if (!role) return roleError({ reaction, user, collector });

  await msg.guild?.members.resolve(user.id)?.roles.add(role);

  const dm = await user.createDM();
  dm.send(
    new Embed({
      intent: 'success',
      title: `received role \`${role.name}\` in ${msg.guild?.name}!`,
      description: 'remove the reaction from the message to remove this role.',
    })
  );
};

export const onMessageReactionRemove = (em: Gamerbot['em']) => async (
  reaction: MessageReaction,
  user: User | PartialUser
): Promise<unknown> => {
  const { message: msg } = reaction;
  if (user.id === client.user?.id) return;
  if (!(await verifyReaction(reaction, user))) return;

  const collector = await getCollector({ em, msg, reaction });
  if (!collector) return;

  if (!missingPermissions({ msg, user })) return;

  const role = msg.guild?.roles.resolve(collector.roleId);
  if (!role) return roleError({ reaction, user, collector });

  await msg.guild?.members.resolve(user.id)?.roles.remove(role);

  const dm = await user.createDM();
  dm.send(
    new Embed({
      intent: 'success',
      title: `removed role \`${role.name}\` in ${msg.guild?.name}!`,
      description: 'react to the message again to get the role back.',
    })
  );
};
