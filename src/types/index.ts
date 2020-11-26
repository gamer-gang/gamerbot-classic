import { Guild, Message } from 'discord.js';
import yargsParser from 'yargs-parser';

import { Config } from '../entities/Config';

export * from './economy';
export * from './games';
export * from './music';

export interface Context {
  msg: Message & { guild: Guild };
  args: yargsParser.Arguments;
  cmd: string;
  config: Config;
  startTime: [number, number];
}
