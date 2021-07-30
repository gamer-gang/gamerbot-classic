import { resolvePath } from '@gamerbot/util';
import { execSync } from 'child_process';
import * as log4js from 'log4js';
import { GamerbotMusic } from './GamerbotMusic';

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

log4js.levels.FATAL.colour = 'red';
log4js.levels.DEBUG.colour = 'magenta';

log4js.configure({
  appenders: {
    _fileTrace: { ...fileAppender, filename: resolvePath(`logs/music-trace.log`) },
    fileTrace: { ...levelFilter('_fileTrace'), level: 'trace' },

    _fileDebug: { ...fileAppender, filename: resolvePath(`logs/music-debug.log`) },
    fileDebug: { ...levelFilter('_fileDebug'), level: 'debug' },

    _fileInfo: { ...fileAppender, filename: resolvePath(`logs/music-info.log`) },
    fileInfo: { ...levelFilter('_fileInfo'), level: 'info' },

    _fileWarn: { ...fileAppender, filename: resolvePath(`logs/music-warn.log`) },
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
log4js.getLogger('').mark('\n' + execSync('figlet -f small gamerbot music').toString());

export const client = new GamerbotMusic();
