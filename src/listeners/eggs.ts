import { Message, PartialMessage } from 'discord.js';
import fse from 'fs-extra';

import { setPresence } from '..';
import { Config } from '../entities/Config';
import { Context } from '../types';
import { resolvePath } from '../util';

type EventMessage = Message | PartialMessage;

const eggy = (msg: EventMessage) =>
  ['🥚', 'egg'].some(egg => msg.content?.toLowerCase().includes(egg));

const EGGFILE = resolvePath('data/eggcount.txt');

fse.ensureFileSync(EGGFILE);
let eggCount: number = parseInt(fse.readFileSync(EGGFILE).toString('utf-8')) || 0;

export const get = (): number => eggCount;
export const change = (delta: number): void => set(eggCount + delta);
export const set = (count: number): void => {
  if (eggCount === count) return;
  eggCount = count;
  fse.writeFile(EGGFILE, eggCount.toString());
  setPresence();
};

export const onMessage = (msg: EventMessage, config: Config) => (): void => {
  if (config.egg && eggy(msg)) {
    msg.react('🥚');
    change(1);
  }
};

export const onMessageDelete = (em: Context['em']) => async (msg: EventMessage): Promise<void> => {
  const config = await em.findOne(Config, { guildId: msg.guild?.id as string });
  if (!config || msg.author?.bot || !config.egg) return;

  if (config.egg && eggy(msg)) change(-1);
};

export const onMessageUpdate = (em: Context['em']) => async (
  prev: EventMessage,
  next: EventMessage
): Promise<void> => {
  const config = await em.findOne(Config, { guildId: next.guild?.id as string });
  if (!config || next.author?.bot || !config.egg) return;

  if (!eggy(prev) && eggy(next)) {
    next.react('🥚');
    change(1);
  } else if (eggy(prev) && !eggy(next)) {
    try {
      next.reactions.cache.get('🥚')?.remove();
      change(-1);
    } catch {
      // whatever
    }
  }
};
