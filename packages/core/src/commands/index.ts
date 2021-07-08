import { Context } from '@gamerbot/types';
import { Message, PermissionString } from 'discord.js';
import yargsParser from 'yargs-parser';

export interface Command {
  cmd: string | string[];
  yargs?: yargsParser.Options;
  docs: CommandDocs;
  userPermissions?: PermissionString[];
  botPermissions?: PermissionString[];
  execute: (args: Context) => Promise<void | Message>;
}

export type CommandDocs = Docs | Docs[];

interface Docs {
  usage: string | string[];
  description: string;
}
