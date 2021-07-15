import { registerClientUtil, resolvePath } from '@gamerbot/util';
import { EntityManager, MikroORM } from '@mikro-orm/core';
import { AsyncLocalStorage } from 'async_hooks';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import fse from 'fs-extra';
import log4js from 'log4js';
import { Gamerbot } from './gamerbot';
import mikroOrmConfig from './mikro-orm.config';

dotenv.config({ path: resolvePath('.env') });

fse.mkdirp(resolvePath('logs'));

const devMode = process.env.NODE_ENV === 'development';

const fileAppender = {
  type: 'file',
  maxLogSize: 10485760, // ~10 MB
  compress: true,
};

const levelFilter = (name: string) => ({
  type: 'logLevelFilter',
  appender: name,
  maxLevel: 'mark',
});

log4js.configure({
  appenders: {
    _fileTrace: { ...fileAppender, filename: resolvePath(`logs/trace.log`) },
    fileTrace: { ...levelFilter('_fileTrace'), level: 'trace' },

    _fileDebug: { ...fileAppender, filename: resolvePath(`logs/debug.log`) },
    fileDebug: { ...levelFilter('_fileDebug'), level: 'debug' },

    _fileInfo: { ...fileAppender, filename: resolvePath(`logs/info.log`) },
    fileInfo: { ...levelFilter('_fileInfo'), level: 'info' },

    _fileWarn: { ...fileAppender, filename: resolvePath(`logs/warn.log`) },
    fileWarn: { ...levelFilter('_fileWarn'), level: 'warn' },

    _console: { type: 'console', layout: { type: 'colored' } },
    console: {
      ...levelFilter('_console'),
      level: devMode ? 'trace' : 'info',
    },
  },
  categories: {
    default: {
      appenders: devMode
        ? ['console']
        : ['console', 'fileWarn', 'fileInfo', 'fileDebug', 'fileTrace'],
      level: 'trace',
      enableCallStack: !devMode,
    },
  },
});

export const getLogger = (category: string): log4js.Logger => log4js.getLogger(category);
export const dbLogger = log4js.getLogger('MikroORM');

// init message
getLogger('').mark('\n' + execSync('figlet -f small gamerbot').toString());

// db
export const storage = new AsyncLocalStorage<EntityManager>();
export const orm = await MikroORM.init({ ...mikroOrmConfig, context: () => storage.getStore() });
await orm.getMigrator().up();

// client
export const client: Gamerbot = new Gamerbot();
registerClientUtil(client);
