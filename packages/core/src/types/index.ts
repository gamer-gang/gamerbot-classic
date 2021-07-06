import { Guild, Message, NewsChannel, TextChannel, ThreadChannel } from 'discord.js';
import yargsParser from 'yargs-parser';
import { Config } from '../entities/Config';

export * from './economy';
export * from './games';
export * from './music';

export interface Context {
  msg: Message & { guild: Guild; channel: TextChannel | NewsChannel | ThreadChannel };
  args: yargsParser.Arguments;
  cmd: string;
  config: Config;
  startTime: [number, number];
}
