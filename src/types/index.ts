import { Connection, EntityManager, IDatabaseDriver } from '@mikro-orm/core';
import Discord from 'discord.js';
import yargsParser from 'yargs-parser';

import { Config } from '../entities/Config';
import { Store } from '../util/store';
import { GuildGames } from './games';
import { GuildQueue } from './music';

export * from './economy';
export * from './games';
export * from './music';

export interface CmdArgs {
  msg: Discord.Message | Discord.PartialMessage;
  args: yargsParser.Arguments;
  cmd: string;
  config: Config;
  queueStore: Store<GuildQueue>;
  gameStore: Store<GuildGames>;
  em: EntityManager<IDatabaseDriver<Connection>>;
}
