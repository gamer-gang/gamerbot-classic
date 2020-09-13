import { MikroORM } from '@mikro-orm/core';
import path from 'path';

import { Config } from './entities/Config';
import { LiarsDice, LiarsDicePlayer } from './entities/LiarsDice';
import { ReactionRole } from './entities/ReactionRole';
import { resolvePath } from './util';

export default {
  entities: [Config, ReactionRole, LiarsDice, LiarsDicePlayer],
  dbName: 'gamerbot',
  type: 'postgresql',
  debug: process.env.NODE_ENV === 'development',
  baseDir: resolvePath('.'),
  migrations: {
    path: path.join(__dirname, './migrations'), // path to the folder with migrations
    pattern: /^[\w-]+\d+\.[tj]s$/, // regex pattern for the migration files
  },
} as Parameters<typeof MikroORM.init>[0];
