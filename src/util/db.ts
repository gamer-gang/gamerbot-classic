import { DMChannel, NewsChannel, TextChannel } from 'discord.js';

export const dbFindOneError = (channel: TextChannel | DMChannel | NewsChannel) => {
  return (entityName: string, where: unknown): Error => {
    const errorText = `db error: expected one of ${entityName} where \`${JSON.stringify(where)}\``;
    channel.send(errorText);
    return new Error(errorText);
  };
};
