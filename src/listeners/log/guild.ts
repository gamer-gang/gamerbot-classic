import { Guild, TextChannel } from 'discord.js';
import { LogHandlers } from '.';

export const guildHandlers: LogHandlers = {
  onGuildUpdate: (guild: Guild, logChannel: TextChannel) => async (prev: Guild, next: Guild) => {
    // TODO
  },
};
