import { Connection, EntityManager, IDatabaseDriver } from '@mikro-orm/core';
import Discord from 'discord.js';
import YouTube from 'simple-youtube-api';

import { Store } from '../store';
import { GuildGames } from './games';
import { GuildQueue } from './youtube';

export * from './economy';
export * from './games';
export * from './youtube';

// export interface GuildConfig {
//   prefix: string;
//   allowSpam: boolean;
// }

export interface CmdArgs {
  msg: Discord.Message | Discord.PartialMessage;
  args: string[];
  flags: Record<string, number>;
  cmd: string;
  youtube: YouTube;
  client: Discord.Client;
  // configStore: Store<GuildConfig>;
  queueStore: Store<GuildQueue>;
  gameStore: Store<GuildGames>;
  em: EntityManager<IDatabaseDriver<Connection>>;
}
