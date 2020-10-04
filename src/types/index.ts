import { Connection, EntityManager, IDatabaseDriver } from '@mikro-orm/core';
import Discord from 'discord.js';

import { Store } from '../util/store';
import { GuildGames } from './games';
import { GuildQueue } from './youtube';

export * from './economy';
export * from './games';
export * from './youtube';

export interface CmdArgs {
  msg: Discord.Message | Discord.PartialMessage;
  args: string[];
  flags: Record<string, number>;
  cmd: string;
  queueStore: Store<GuildQueue>;
  gameStore: Store<GuildGames>;
  em: EntityManager<IDatabaseDriver<Connection>>;
}
