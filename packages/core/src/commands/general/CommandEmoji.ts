import { Embed } from '@gamerbot/util';
import { GuildEmoji, Message, Snowflake } from 'discord.js';
import { ChatCommand, CommandDocs, CommandOptions } from '..';
import { APIMessage, CommandEvent } from '../../models/CommandEvent';

export class CommandEmoji extends ChatCommand {
  name = ['emoji', 'emote'];
  help: CommandDocs = [
    {
      usage: 'emoji <emoji>',
      description: 'show raw image/gif of a custom emoji',
    },
  ];
  data: CommandOptions = {
    description: 'Show raw image/gif of a custom emoji',
    options: [
      {
        name: 'emoji',
        description: 'Emoji, name, or ID (must belong to the current server)',
        type: 'STRING',
        required: true,
      },
    ],
  };
  async execute(event: CommandEvent): Promise<void | Message | APIMessage> {
    const input = event.isInteraction()
      ? event.options.getString('emoji', true).trim()
      : event.args.trim();
    const customEmojiRegex = /^<a?:?[a-z_]+:(\d+)>$/;
    let emoji: GuildEmoji;

    await event.defer();

    if (customEmojiRegex.test(input)) {
      const [, id] = customEmojiRegex.exec(input)!;
      const resolved = event.guild.emojis.resolve(id as Snowflake);
      if (!resolved)
        return event.editReply(
          Embed.error('Invalid emoji', 'Emojis must belong to the server this command is used in.')
        );
      emoji = resolved;
    } else {
      await event.guild.emojis.fetch();
      const resolved =
        event.guild.emojis.resolve(input as Snowflake) ??
        event.guild.emojis.cache.find(e => e.name?.toLowerCase() === input?.toLowerCase());
      if (!resolved) return event.editReply(Embed.error('Invalid emoji'));
      emoji = resolved;
    }

    let guildIcon = event.guild.iconURL({ dynamic: true, size: 4096 });
    if (guildIcon?.includes('.webp'))
      guildIcon = event.guild.iconURL({ format: 'png', size: 4096 });

    const embed = new Embed({
      author: {
        iconURL: guildIcon ?? undefined,
        name: event.guild.name,
      },
      title: emoji.name ?? 'Emoji',
      image: {
        url: emoji.url,
      },
    });

    event.editReply(embed);
  }
}
