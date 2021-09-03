import { Guild, TextChannel } from 'discord.js';
import { LogHandlers } from './_constants';

export const guildHandlers: LogHandlers = {
  onGuildUpdate: (guild: Guild, logChannel: TextChannel) => async (prev: Guild, next: Guild) => {
    // TODO:
  },
};
