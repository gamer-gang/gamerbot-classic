import { codeBlock } from '@discordjs/builders';
import { Embed, parseDiscohookJSON } from '@gamerbot/util';
import { Message, MessageActionRow, MessageButton } from 'discord.js';
import { Config } from '../../../entities/Config';
import { CommandEvent } from '../../../models/CommandEvent';

const replacer = (event: CommandEvent) => (json: string) =>
  json
    .replace(/%USER%/g, `<@${event.user.id}>`)
    .replace(/%USERTAG%/g, `${event.user.tag}`)
    .replace(/%GUILD%/g, `${event.guild.name}`);

export const welcomeMessage = async (
  event: CommandEvent,
  value?: string
): Promise<void | Message | Message[]> => {
  const config = await event.em.findOneOrFail(Config, { guildId: event.guild.id });

  const exampleReplace = replacer(event);

  if (!value) {
    if (!config.welcomeJson) return event.reply(Embed.info('No welcome message set'));
    await event.reply(
      Embed.info(
        `${event.guild.name}: current welcome message (\`${config.prefix}config welcomeMessage unset\` to remove)`,
        codeBlock(JSON.stringify(JSON.parse(config.welcomeJson), null, 2), 'json')
      )
    );

    return event.channel.send(parseDiscohookJSON(exampleReplace(config.welcomeJson)));
  }

  if (value === 'unset') {
    delete config.welcomeJson;
    return event.reply(Embed.success('Unset welcome message'));
  }

  try {
    if (config.welcomeJson) {
      await event.reply('Existing welcome message: ');
      await event.channel.send(parseDiscohookJSON(exampleReplace(config.welcomeJson)));

      const row = new MessageActionRow({
        components: [
          new MessageButton({ customId: 'cancel', style: 'DANGER', label: 'Cancel' }),
          new MessageButton({ customId: 'replace', style: 'PRIMARY', label: 'Replace' }),
        ],
      });

      const confirmationMessage = `${event.user} replace this welcome message with a new one?`;

      const confirmation = await event.channel.send({
        content: confirmationMessage,
        components: [row],
      });

      const collector = confirmation.createMessageComponentCollector({
        idle: 1000 * 60 * 5,
        filter: interaction => interaction.user.id === event.user.id,
      });

      collector.on('collect', interaction => {
        if (interaction.customId)
          return void interaction.reply({ embeds: [Embed.info('Cancelled')] });

        collector.stop();
        confirmMessage(value, event);
      });

      collector.on(
        'stop',
        () => void confirmation.edit({ content: confirmationMessage, components: [] })
      );

      return;
    }

    confirmMessage(value, event);
  } catch (err) {
    Embed.error(codeBlock(err)).send(event.channel);
  }
};

const confirmMessage = async (json: string, event: CommandEvent) => {
  const config = await event.em.findOneOrFail(Config, { guildId: event.guild.id });

  if (event.isMessage() || event.interaction.replied)
    await event.channel.send(parseDiscohookJSON(replacer(event)(json)));
  await event.reply(parseDiscohookJSON(replacer(event)(json)));

  const row = new MessageActionRow({
    components: [
      new MessageButton({ customId: 'cancel', style: 'DANGER', label: 'Cancel' }),
      new MessageButton({ customId: 'replace', style: 'PRIMARY', label: 'Set' }),
    ],
  });

  const confirmationMessage = `${event.user} set this as the welcome message?`;
  const confirmation = await event.channel.send({
    content: confirmationMessage,
    components: [row],
  });

  const collector = confirmation.createMessageComponentCollector({
    idle: 1000 * 60 * 5,
    filter: interaction => interaction.user.id === event.user.id,
  });

  collector.on('collect', interaction => {
    if (interaction.customId === 'cancel')
      return void interaction.reply({ embeds: [Embed.info('Cancelled')] });

    collector.stop();
    config.welcomeJson = JSON.stringify(JSON.parse(json));

    if (!config.welcomeChannelId)
      interaction.reply({
        embeds: [
          Embed.warning(
            'message set successfully',
            'warning: no welcome channel set; messages will default to system message channel'
          ),
        ],
      });
    else interaction.reply({ embeds: [Embed.success('new welcome message set')] });
  });

  collector.on(
    'stop',
    () => void confirmation.edit({ content: confirmationMessage, components: [] })
  );
};
