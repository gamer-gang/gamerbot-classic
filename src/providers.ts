import { MikroORM } from '@mikro-orm/core';
import dotenv from 'dotenv';
import fse from 'fs-extra';
import log4js from 'log4js';

import { Gamerbot } from './gamerbot';
import mikroOrmConfig from './mikro-orm.config';
import { resolvePath } from './util';

dotenv.config({ path: resolvePath('.env') });

fse.mkdirp(resolvePath('logs'));

log4js.configure({
  appenders: {
    file: { type: 'file', filename: `logs/${new Date().toISOString()}.log` },
    console: { type: 'console', layout: { type: 'colored' } },
  },
  categories: {
    default: {
      appenders: process.env.NODE_ENV === 'production' ? ['file'] : ['console'],
      level: 'debug',
      enableCallStack: true,
    },
  },
});

export const logger = log4js.getLogger('MAIN');
export const getLogger = (category: string): log4js.Logger => log4js.getLogger(category);
export const dbLogger = log4js.getLogger('DB');

// db
const orm = await MikroORM.init(mikroOrmConfig);
await orm.getMigrator().up();

// client
export const client = new Gamerbot({ em: orm.em });
