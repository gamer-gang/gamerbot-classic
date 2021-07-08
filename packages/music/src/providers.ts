import * as log4js from 'log4js';
import { GamerbotMusic } from './GamerbotMusic';

log4js.configure({
  appenders: {
    file: { type: 'file', filename: `logs/${new Date().toISOString()}.log` },
    console: { type: 'console', layout: { type: 'colored' } },
  },
  categories: {
    default: {
      appenders: process.env.NODE_ENV === 'production' ? ['file', 'console'] : ['console'],
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      enableCallStack: true,
    },
  },
});

export const getLogger = (category: string): log4js.Logger => log4js.getLogger(category);

export const client = new GamerbotMusic();
