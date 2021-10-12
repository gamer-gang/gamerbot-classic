import {
  ChatInputApplicationCommandData,
  ContextMenuInteraction,
  Message,
  PermissionString,
} from 'discord.js';
import { APIMessage, CommandEvent, ContextMenuCommandEvent } from '../models/CommandEvent';

export type CommandOptions = Omit<ChatInputApplicationCommandData, 'name'>;
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

export type Command = ChatCommand | UserCommand | MessageCommand;

export abstract class BaseCommand {
  abstract type: string;
  readonly internal: boolean = false;
  readonly logUses: boolean = false;

  userPermissions?: PermissionString[];
  botPermissions?: PermissionString[];
}

export abstract class ChatCommand extends BaseCommand {
  readonly type = 'CHAT_INPUT';
  abstract name: string[];

  abstract help: CommandDocs;
  data?: CommandOptions;

  abstract execute(event: CommandEvent): Promise<void | Message | APIMessage>;
}

export abstract class UserCommand extends BaseCommand {
  readonly type = 'USER';
  abstract name: string;
  help = null;
  abstract execute(event: ContextMenuCommandEvent): Promise<void | Message | APIMessage>;
}

export abstract class MessageCommand extends BaseCommand {
  readonly type = 'MESSAGE';
  abstract name: string;
  help = null;

  abstract execute(event: ContextMenuCommandEvent): Promise<void | Message | APIMessage>;
}

export abstract class InternalCommand extends ChatCommand {
  readonly internal = true;
}
