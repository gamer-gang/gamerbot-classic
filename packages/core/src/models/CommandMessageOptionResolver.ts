import {
  CommandInteractionOption,
  CommandInteractionOptionResolver,
  GuildChannel,
  GuildMember,
  Role,
  User,
} from 'discord.js';
import { Command } from '../commands';

export type CommandOptionsParser = CommandMessageOptionResolver | CommandInteractionOptionResolver;

export type Mentionable = User | GuildMember | Role;

export class CommandMessageOptionResolver {
  constructor(public command: Command, public argv: string[]) {}

  get(name: string, required: true): CommandInteractionOption;
  get(name: string, required?: boolean): CommandInteractionOption | null;
  get(name: string, required?: boolean): CommandInteractionOption | null {
    throw new Error('Method not implemented.');
  }
  getSubcommand(): string {
    throw new Error('Method not implemented.');
  }
  getSubcommandGroup(): string {
    throw new Error('Method not implemented.');
  }
  getBoolean(name: string, required: true): boolean;
  getBoolean(name: string, required?: boolean): boolean | null;
  getBoolean(name: string, required?: boolean): boolean | null {
    throw new Error('Method not implemented.');
  }
  getChannel(name: string, required: true): GuildChannel;
  getChannel(name: string, required?: boolean): GuildChannel | null;
  getChannel(name: string, required?: boolean): GuildChannel | null {
    throw new Error('Method not implemented.');
  }
  getString(name: string, required: true): string;
  getString(name: string, required?: boolean): string | null;
  getString(name: string, required?: boolean): string | null {
    throw new Error('Method not implemented.');
  }
  getInteger(name: string, required: true): number;
  getInteger(name: string, required?: boolean): number | null;
  getInteger(name: string, required?: boolean): number | null {
    throw new Error('Method not implemented.');
  }
  getUser(name: string, required: true): User;
  getUser(name: string, required?: boolean): User | null;
  getUser(name: string, required?: boolean): User | null {
    throw new Error('Method not implemented.');
  }
  getMember(name: string, required: true): GuildMember;
  getMember(name: string, required?: boolean): GuildMember | null;
  getMember(name: string, required?: boolean): GuildMember | null {
    throw new Error('Method not implemented.');
  }
  getRole(name: string, required: true): Role;
  getRole(name: string, required?: boolean): Role | null;
  getRole(name: string, required?: boolean): Role | null {
    throw new Error('Method not implemented.');
  }
  getMentionable(name: string, required: true): Mentionable;
  getMentionable(name: string, required?: boolean): Mentionable | null;
  getMentionable(name: string, required?: boolean): Mentionable | null {
    throw new Error('Method not implemented.');
  }
}
