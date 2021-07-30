import { registerClientUtil, resolvePath } from '@gamerbot/util';
import { Connection, EntityManager, IDatabaseDriver, MikroORM } from '@mikro-orm/core';
import { AsyncLocalStorage } from 'async_hooks';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import fse from 'fs-extra';
import log4js, { getLogger } from 'log4js';
import { Gamerbot } from './gamerbot';

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
    _fileTrace: { ...fileAppender, filename: resolvePath(`logs/core-trace.log`) },
    fileTrace: { ...levelFilter('_fileTrace'), level: 'trace' },

    _fileDebug: { ...fileAppender, filename: resolvePath(`logs/core-debug.log`) },
    fileDebug: { ...levelFilter('_fileDebug'), level: 'debug' },

    _fileInfo: { ...fileAppender, filename: resolvePath(`logs/core-info.log`) },
    fileInfo: { ...levelFilter('_fileInfo'), level: 'info' },

    _fileWarn: { ...fileAppender, filename: resolvePath(`logs/core-warn.log`) },
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

// init message
getLogger('').mark('\n' + execSync('figlet -f small gamerbot').toString());

// db
export const storage = new AsyncLocalStorage<EntityManager>();
let orm: MikroORM<IDatabaseDriver<Connection>>;

let initORM: Promise<void>;

export const getORM = async (): Promise<typeof orm> => {
  if (!orm) {
    if (!initORM)
      initORM = new Promise(resolve => {
        MikroORM.init({
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          ...require('./mikro-orm.config').default,
          context: () => storage.getStore(),
        }).then(tempORM => {
          tempORM
            .getMigrator()
            .up()
            .then(() => {
              orm = tempORM;
              resolve();
            });
        });
      });

    await initORM;
  }

  return orm;
};

/** use with caution; may be undefined/not work */
export const directORM = (): typeof orm => orm;

// client
export const client: Gamerbot = new Gamerbot();
registerClientUtil(client);
