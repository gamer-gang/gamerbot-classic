import { ApplicationCommandData, Message, PermissionString } from 'discord.js';
import { APIMessage, CommandEvent } from '../models/CommandEvent';

export type CommandOptions = Omit<ApplicationCommandData, 'name'>;
// export interface Command {
//   cmd: string | string[];
//   yargs?: yargsParser.Options;
//   docs: CommandDocs;
//   userPermissions?: PermissionString[];
//   botPermissions?: PermissionString[];
//   execute: (args: Context) => Promise<void | Message>;
//   slashCommandData?: SlashCommandData;
// }

export type CommandDocs = Documentation[];
interface Documentation {
  usage: string | string[];
  description: string;
}

export abstract class Command {
  internal = false;
  abstract cmd: string[];

  abstract docs: CommandDocs;

  commandOptions?: CommandOptions;
  // yargs?: yargsParser.Options;
  userPermissions?: PermissionString[];
  botPermissions?: PermissionString[];
  abstract execute(event: CommandEvent): Promise<void | Message | APIMessage>;
}

export abstract class InternalCommand extends Command {
  internal = true;
}
