import { Guild } from 'discord.js';

import { LogHandlers } from './log';

export const guildHandlers: LogHandlers = {
  onGuildUpdate: async (prev: Guild, next: Guild) => {
    //
  },
};
