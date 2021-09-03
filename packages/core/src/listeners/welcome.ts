import { dbFindOneError, parseDiscohookJSON } from '@gamerbot/util';
import { GuildMember, PartialGuildMember, TextChannel } from 'discord.js';
import { Config } from '../entities/Config';
import { getORM } from '../providers';

export const onGuildMemberAdd = async (member: GuildMember | PartialGuildMember): Promise<void> => {
  const orm = await getORM();

  const config = await orm.em.findOneOrFail(
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
      .replace(/%USER%/g, `<@${member.id}>`)
      .replace(/%USERTAG%/g, `${member.user?.tag}`)
      .replace(/%GUILD%/g, `${member.guild.name}`);

  config.welcomeChannelId
    ? (member.guild.channels.cache.get(config.welcomeChannelId) as TextChannel)?.send(
        parseDiscohookJSON(replace(config.welcomeJson))
      )
    : member.guild.systemChannel?.send(parseDiscohookJSON(replace(config.welcomeJson)));
};
