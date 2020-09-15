import { Message } from 'discord.js';

import { CmdArgs } from '../types';
import { CommandAbout } from './about';
import { CommandCowsay } from './cowsay';
import { CommandEcho } from './echo';
import { CommandGif } from './gif';
import { CommandHelp } from './help';
import { CommandJoke } from './joke';
import { CommandPrefix } from './prefix';
import { CommandRole } from './role';
import { CommandAllowSpam } from './spam/allowspam';
import { CommandLorem } from './spam/lorem';
import { CommandRandom } from './spam/random';
import { CommandSpam } from './spam/spam';
import { CommandStats } from './stats/stats';
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
  new CommandEcho(),
  new CommandGif(),
  new CommandHelp(),
  new CommandJoke(),
  // not don yet
  // new CommandLiarsDice(),
  new CommandLorem(),
  new CommandPlay(),
  new CommandPrefix(),
  new CommandQueue(),
  new CommandRandom(),
  new CommandRole(),
  new CommandSkip(),
  new CommandSpam(),
  new CommandStats(),
  new CommandStop(),
];
