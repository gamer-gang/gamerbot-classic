import { resolvePath } from '@gamerbot/util';
import { EntityManager } from '@mikro-orm/postgresql';
import { Message, MessageReaction, PartialMessage, User } from 'discord.js';
import fse from 'fs-extra';
import yaml from 'js-yaml';
import _ from 'lodash';
import { setPresence } from '..';
import { Config } from '../entities/Config';
import { EggLeaderboard } from '../entities/EggLeaderboard';
import { Gamerbot } from '../gamerbot';
import { getORM } from '../providers';

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

const getEggsFromDB = async () => {
  const orm = await getORM();

  const builder = (orm.em as EntityManager).createQueryBuilder(EggLeaderboard);
  const eggsObjects: { eggs: number }[] = await builder.select('eggs').execute();

  return eggsObjects.reduce((a, b) => ({ eggs: a.eggs + b.eggs }), { eggs: 0 }).eggs;
};

let eggCount: number;

const getLeaderboardEntry = async (user: User) => {
  const orm = await getORM();

  const entry = await (async (user: User) => {
    const existing = await orm.em.findOne(EggLeaderboard, { userId: user.id });
    if (existing) {
      if (user.tag !== existing.userTag) existing.userTag = user.tag;
      return existing;
    }

    const fresh = orm.em.create(EggLeaderboard, { userId: user.id, userTag: user.tag });
    await orm.em.persistAndFlush(fresh);
    return await orm.em.findOneOrFail(EggLeaderboard, { userId: user.id });
  })(user);

  return entry;
};

export const get = async (client: Gamerbot): Promise<number> => {
  return (eggCount ??= await getEggsFromDB());
};

const grantEgg = async (msg: Message | PartialMessage) => {
  const orm = await getORM();

  msg.react('🥚');
  eggCount++;
  setPresence();

  const lb = await getLeaderboardEntry(msg.author as User);
  lb.eggs++;
  orm.em.flush();
};

export const onMessage = async (
  msg: Message | PartialMessage,
  config: Config
): Promise<void | Message | MessageReaction> => {
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
    grantEgg(msg);
    return;
  }
};
