import { GuildMember, PartialGuildMember, TextChannel } from 'discord.js';
import { Config } from '../entities/Config';
import { Gamerbot } from '../gamerbot';
import { dbFindOneError, parseDiscohookJSON } from '../util';

export const onGuildMemberAdd = (em: Gamerbot['em']) => async (
  member: GuildMember | PartialGuildMember
): Promise<void> => {
  const config = await em.findOneOrFail(
    Config,
    { guildId: member.guild.id },
    {
      failHandler: member.guild.systemChannel
        ? dbFindOneError(member.guild.systemChannel)
        : () => Error(),
    }
  );

  if (member.user?.bot) return;

  if (!config.welcomeJson) return;

  const replace = (json: string) =>
    json
      .replace('%USER%', `<@!${member.id}>`)
      .replace('%USERTAG%', `${member.user?.tag}`)
      .replace('%GUILD%', `${member.guild.name}`);

  config.welcomeChannelId
    ? (member.guild.channels.cache.get(config.welcomeChannelId) as TextChannel)?.send(
        parseDiscohookJSON(replace(config.welcomeJson))
      )
    : member.guild.systemChannel?.send(parseDiscohookJSON(replace(config.welcomeJson)));
};
