import { RequestContext } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { Message, MessageReaction, PartialMessage, User } from 'discord.js';
import fse from 'fs-extra';
import yaml from 'js-yaml';
import _ from 'lodash';
import { setPresence } from '..';
import { Config } from '../entities/Config';
import { EggLeaderboard } from '../entities/EggLeaderboard';
import { Gamerbot } from '../gamerbot';
import { resolvePath } from '../util';

const eggfile = yaml.load(fse.readFileSync(resolvePath('assets/egg.yaml')).toString('utf-8'));
if (typeof eggfile !== 'object') throw new Error('egg.yaml must be object');

const eggs = _.uniq((eggfile as { eggs?: string[] }).eggs?.map(egg => egg.toLowerCase()));
if (!eggs?.length) throw new Error('no eggs specified in assets/egg.yaml');

const eggy = (msg: Message | PartialMessage, prefix: string) =>
  eggs.some(egg => msg.content?.toLowerCase().includes(egg)) &&
  !msg.content?.toLowerCase().startsWith(prefix);

const cooldown = 30000;

class EggCooldown {
  constructor(public timestamp: number, public warned = false) {}

  expired(): boolean {
    return Date.now() > this.timestamp + cooldown;
  }
}

const cooldowns: Record<string, EggCooldown> = {};

const getEggsFromDB = async (em: Gamerbot['em']) => {
  const builder = (em as EntityManager).createQueryBuilder(EggLeaderboard);
  const eggsObjects: { eggs: number }[] = await builder.select('eggs').execute();

  return eggsObjects.reduce((a, b) => ({ eggs: a.eggs + b.eggs }), { eggs: 0 }).eggs;
};

let eggCount: number;

const getLeaderboardEntry = async (user: User, em: Gamerbot['em']) => {
  const entry = await (async (user: User) => {
    const existing = await em.findOne(EggLeaderboard, { userId: user.id });
    if (existing) {
      if (user.tag !== existing.userTag) existing.userTag = user.tag;
      return existing;
    }

    const fresh = em.create(EggLeaderboard, { userId: user.id, userTag: user.tag });
    await em.persistAndFlush(fresh);
    return await em.findOneOrFail(EggLeaderboard, { userId: user.id });
  })(user);

  return entry;
};

export const get = async (client: Gamerbot): Promise<number> => {
  return (eggCount ??= await getEggsFromDB(RequestContext.getEntityManager() ?? client.em));
};

const grantEgg = async (msg: Message | PartialMessage, em: Gamerbot['em']) => {
  msg.react('🥚');
  eggCount++;
  setPresence();

  const lb = await getLeaderboardEntry(msg.author as User, em);
  lb.eggs++;
  em.flush();
};

export const onMessage = (
  msg: Message | PartialMessage,
  config: Config,
  em: Gamerbot['em']
) => async (): Promise<void | Message | MessageReaction> => {
  if (!config || !config.egg) return;

  if (eggy(msg, config.prefix)) {
    if (msg.author?.tag.endsWith('#0000')) {
      msg.react('🥚');
      return;
    }

    if (cooldowns[msg.author?.id as string]) {
      const cooldown = cooldowns[msg.author?.id as string];
      if (!cooldown.expired() && !cooldown.warned) {
        cooldown.warned = true;
        return msg.react('❄️');
      }

      if (!cooldown.expired()) return;
    }

    cooldowns[msg.author?.id as string] = new EggCooldown(Date.now());
    grantEgg(msg, em);
    return;
  }
};
