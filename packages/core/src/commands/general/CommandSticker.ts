import { Embed } from '@gamerbot/util';
import { Message, MessageActionRow, MessageButton, Snowflake } from 'discord.js';
import { ChatCommand, CommandDocs, CommandOptions } from '..';
import { APIMessage, CommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';

export class CommandEmoji extends ChatCommand {
  name = ['sticker'];
  help: CommandDocs = [
    {
      usage: 'sticker <sticker>',
      description: 'show raw image/gif of a sticker',
    },
  ];
  data: CommandOptions = {
    description: 'Show raw image/gif of a sticker',
    options: [
      {
        name: 'sticker',
        description: 'Name, or ID or sticker',
        type: 'STRING',
        required: true,
      },
    ],
  };
  async execute(event: CommandEvent): Promise<void | Message | APIMessage> {
    const input = event.isInteraction()
      ? event.options.getString('sticker', true)
      : event.args.trim();

    await event.defer();

    await event.guild.stickers.fetch();
    const sticker =
      event.guild.stickers.resolve(input as Snowflake) ??
      event.guild.stickers.cache.find(e => e.name.toLowerCase() === input.toLowerCase()) ??
      (await client.fetchSticker(input as Snowflake));

    if (!sticker) return event.reply(Embed.error('Invalid sticker'));

    let guildIcon = event.guild.iconURL({ dynamic: true, size: 4096 });
    if (guildIcon?.includes('.webp'))
      guildIcon = event.guild.iconURL({ format: 'png', size: 4096 });

    const pack = await sticker.fetchPack();

    const embed = new Embed({
      author:
        sticker.type === 'STANDARD'
          ? undefined
          : {
              iconURL: guildIcon ?? undefined,
              name: event.guild.name,
            },
      title: `${sticker.name} (${sticker.type === 'STANDARD' ? 'standard' : 'guild'})`,
      description: `${pack ? `**Pack**: ${pack.name}` : ''}
${sticker.description ? `**Description**: ${sticker.description}` : 'No description set'}
${sticker.tags?.length ? `**Tags**: ${sticker.tags.join(' ')}` : 'No tags set'}`,
      image: {
        url: sticker.format === 'LOTTIE' ? undefined : sticker.url,
      },
    });

    event.editReply({
      embeds: [embed],
      components:
        sticker.format === 'LOTTIE'
          ? [
              new MessageActionRow({
                components: [
                  new MessageButton({ style: 'LINK', url: sticker.url, label: 'Lottie JSON file' }),
                ],
              }),
            ]
          : undefined,
    });
  }
}
