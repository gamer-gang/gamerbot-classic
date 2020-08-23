import { Message } from 'discord.js';
import { CmdArgs } from '../types';
import { CommandAbout } from './about';
import { CommandCowdos } from './cowdos';
import { CommandCowsay } from './cowsay';
import { CommandCowwork } from './cowwork';
import { CommandLiarsDice } from './games/liarsdice';
import { CommandGif } from './gif';
import { CommandHelp } from './help';
import { CommandJoke } from './joke';
import { CommandPrefix } from './prefix';
import { CommandAllowSpam } from './spam/allowspam';
import { CommandLorem } from './spam/lorem';
import { CommandRandom } from './spam/random';
import { CommandSpam } from './spam/spam';
import { CommandPlay } from './youtube/play';
import { CommandQueue } from './youtube/queue';
import { CommandSkip } from './youtube/skip';
import { CommandStop } from './youtube/stop';

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
  new CommandCowwork(),
  new CommandGif(),
  new CommandHelp(),
  new CommandJoke(),
  new CommandLiarsDice(),
  new CommandLorem(),
  new CommandPlay(),
  new CommandPrefix(),
  new CommandQueue(),
  new CommandRandom(),
  new CommandSkip(),
  new CommandStop(),
  new CommandSpam(),
];
