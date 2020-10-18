import { Client } from 'discord.js';
import dotenv from 'dotenv';
import fse from 'fs-extra';
import log4js from 'log4js';
import YouTube from 'simple-youtube-api';
import Spotify from 'spotify-web-api-node';

import { GuildQueue } from './types';
import { resolvePath, Store } from './util';

dotenv.config({ path: resolvePath('.env') });

fse.mkdirp(resolvePath('logs'));

export const client = new Client({
  partials: ['MESSAGE', 'REACTION'],
});

export const youtube = new YouTube(process.env.YT_API_KEY as string);

export const spotify = new Spotify({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

export const queueStore = new Store<GuildQueue>({
  path: 'data/queue.yaml',
  writeOnSet: false,
  readImmediately: false,
  dataLanguage: 'yaml',
});

fse.mkdirp('logs');

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

export enum LoggerType {
  VOICE = 'VOICE',
  MESSAGE = 'MESSAGE',
  REACTION = 'REACTION',
}
export const logger = log4js.getLogger('MAIN');
export const getLogger = (type: LoggerType, category: string): log4js.Logger =>
  log4js.getLogger(`${type} ${category}`);
export const dbLogger = log4js.getLogger('DB');
