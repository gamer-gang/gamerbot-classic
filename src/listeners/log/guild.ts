import { Guild } from 'discord.js';

import { LogHandlers } from '.';

export const guildHandlers: LogHandlers = {
  onGuildUpdate: async (prev: Guild, next: Guild) => {
    //
  },
};
