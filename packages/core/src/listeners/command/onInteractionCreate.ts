import { codeBlock } from '@discordjs/builders';
import { dbFindOneError, Embed } from '@gamerbot/util';
import { CommandInteraction, Interaction, Message } from 'discord.js';
import { getLogger } from 'log4js';
import { MessageCommand, UserCommand } from '../../commands';
import { ongoingTriviaQuestions } from '../../commands/games/CommandTrivia';
import { Config } from '../../entities/Config';
import { BaseCommandEvent, NormalTextChannel } from '../../models/CommandEvent';
import { Queue } from '../../models/Queue';
import { client, directORM, getORM } from '../../providers';
import { logCommandEvents, verifyPermissions } from './utils';

export const onInteractionCreate = async (interaction: Interaction): Promise<void | Message> => {
  if (interaction.isContextMenu()) {
    const logger = getLogger(`Client!messageCreate[type=${interaction.type}]`);

    const { commandName } = interaction;
    const command = client.commands
      .filter(c => c.type !== 'CHAT_INPUT')
      .find(c => c.name === commandName) as UserCommand | MessageCommand | undefined;
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      logger.error(err);
      const embed = Embed.error(codeBlock(err));
      if (interaction.deferred) interaction.editReply({ embeds: [embed] });
      else if (interaction.replied) interaction.followUp({ embeds: [embed], ephemeral: true });
      else interaction.reply({ embeds: [embed], ephemeral: true });
    }

    return;
  }

  if (!interaction.isCommand()) return;

  if (!interaction.channel) return;
  if (interaction.channel.type === 'DM')
    // TODO:
    return interaction.reply(
      "I can't respond to DMs at the moment. Use commands in a server for now."
    );
  if (!interaction.guild) return;

  const start = process.hrtime();

  const logger = getLogger(`Client!messageCreate[guild=${interaction.guild.id}]`);

  if (interaction.user.bot && !interaction.user.tag.endsWith('#0000')) return;
  if (interaction.user.id == client.user.id) return;

  !client.queues.has(interaction.guild.id) &&
    client.queues.set(interaction.guild.id, new Queue(interaction.guild.id));

  const orm = await getORM();

  const config = await (async (interaction: CommandInteraction) => {
    const existing = await orm.em.findOne(Config, { guildId: interaction.guild?.id });
    if (existing) return existing;

    const fresh = orm.em.create(Config, { guildId: interaction.guild?.id });
    await orm.em.persistAndFlush(fresh);
    return await orm.em.findOneOrFail(
      Config,
      { guildId: interaction.guild?.id },
      { failHandler: dbFindOneError(interaction.channel! as NormalTextChannel) }
    );
  })(interaction);

  // do not respond if playing trivia
  if (ongoingTriviaQuestions.has(interaction.user.id))
    return interaction.reply({
      ephemeral: true,
      embeds: [Embed.error('Finish the trivia question first!')],
    });

  const event = BaseCommandEvent.from(interaction, {
    config,
    startTime: start,
    em: directORM().em.fork(),
  });

  logCommandEvents(event);

  if (!verifyPermissions(event)) return;

  try {
    await event.command.execute(event);
  } catch (err) {
    logger.error(err);
    const embed = Embed.error(codeBlock(err));
    if (interaction.deferred) event.editReply(embed);
    else if (interaction.replied) event.followUp(embed);
    else event.reply(embed);
  }
};
