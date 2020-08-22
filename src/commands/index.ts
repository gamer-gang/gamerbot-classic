import { Message } from 'discord.js';
import { CmdArgs } from '../types';
import { CommandAbout } from './about';
import { CommandAllowSpam } from './allowspam';
import { CommandCowsay } from './cowsay';
import { CommandCowdos } from './cowdos';
import { CommandGif } from './gif';
import { CommandHelp } from './help';
import { CommandJoke } from './joke';
import { CommandLorem } from './lorem';
import { CommandPlay } from './play';
import { CommandPrefix } from './prefix';
import { CommandQueue } from './queue';
import { CommandRandom } from './random';
import { CommandSkip } from './skip';
import { CommandSpam } from './spam';
import { CommandStop } from './stop';

export interface Command {
  cmd: string | string[];
  executor: (args: CmdArgs) => Promise<void | Message>;
  docs: CommandDocs | CommandDocs[];
}

export interface CommandDocs {
  usage: string | string[];
  description: string;
}

export const commands: Command[] = [
  new CommandAbout(),
  new CommandAllowSpam(),
  new CommandCowsay(),
  new CommandCowdos(),
  new CommandGif(),
  new CommandHelp(),
  new CommandJoke(),
  new CommandLorem(),
  new CommandPlay(),
  new CommandPrefix(),
  new CommandQueue(),
  new CommandRandom(),
  new CommandSkip(),
  new CommandStop(),
  new CommandSpam(),
];
