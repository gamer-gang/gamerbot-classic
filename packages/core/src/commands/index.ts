import {
  ChatInputApplicationCommandData,
  ContextMenuInteraction,
  Message,
  PermissionString,
} from 'discord.js';
import { APIMessage, CommandEvent } from '../models/CommandEvent';

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
export abstract class ChatCommand {
  readonly type = 'CHAT_INPUT';
  readonly internal: boolean = false;
  abstract name: string[];

  abstract help: CommandDocs;

  data?: CommandOptions;
  // yargs?: yargsParser.Options;
  userPermissions?: PermissionString[];
  botPermissions?: PermissionString[];
  abstract execute(event: CommandEvent): Promise<void | Message | APIMessage>;
}

export abstract class UserCommand {
  readonly type = 'USER';
  readonly internal: boolean = false;

  abstract name: string;

  userPermissions?: PermissionString[];
  botPermissions?: PermissionString[];

  abstract execute(interaction: ContextMenuInteraction): Promise<void | Message | APIMessage>;
}

export abstract class MessageCommand {
  readonly type = 'MESSAGE';
  readonly internal: boolean = false;

  abstract name: string;

  userPermissions?: PermissionString[];
  botPermissions?: PermissionString[];

  abstract execute(interaction: ContextMenuInteraction): Promise<void | Message | APIMessage>;
}

export abstract class InternalCommand extends ChatCommand {
  readonly internal: boolean = true;
}
