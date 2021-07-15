import { resolvePath } from '@gamerbot/util';
import { MigrationObject, MikroORM, NullHighlighter } from '@mikro-orm/core';
import { SqlHighlighter } from '@mikro-orm/sql-highlighter';
import c from 'ansi-colors';
import dotenv from 'dotenv';
import fs from 'fs';
import { basename } from 'path';
import { dbLogger } from './providers';

dotenv.config({ path: resolvePath('.env') });

const getEntities = () => {
  let modules;
  if (process.env.WEBPACK) {
    const context = (modules = require.context('./entities', true, /\.ts$/));
    modules = context.keys().map(r => context(r));
  } else {
    modules = fs
      .readdirSync(resolvePath('src/entities'))
      .map(file => require(`./entities/${file}`));
  }

  return modules.flatMap(mod => (Object.keys(mod) as any).map((name: string) => mod[name]));
};

const getMigrations = () => {
  if (process.env.WEBPACK) {
    const modules = require.context('./migrations', false, /\.ts$/);

    return modules
      .keys()
      .map(
        name => <MigrationObject>{ name: basename(name), class: Object.values(modules(name))[0] }
      );
  } else {
    const modules = fs
      .readdirSync(resolvePath('src/migrations'))
      .map(file => require(`./migrations/${file}`));

    return Object.keys(modules).map(
      name =>
        <MigrationObject>{ name: basename(name as string), class: Object.values(modules[name])[0] }
    );
  }
};

export default {
  entities: getEntities(),
  type: 'postgresql',
  host: process.env.POSTGRES_HOST,
  port: 5432,
  dbName: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  debug: true,
  logger: msg => dbLogger.trace(process.env.NODE_ENV === 'development' ? msg : c.unstyle(msg)),
  highlighter:
    process.env.NODE_ENV === 'development' ? new SqlHighlighter() : new NullHighlighter(),
  baseDir: resolvePath('.'),
  discovery: { disableDynamicFileAccess: true },
  migrations: {
    migrationsList: getMigrations(),
    pattern: process.env.WEBPACK ? undefined : /^[\w-]+\d+\.ts$/,
    path: process.env.WEBPACK ? undefined : resolvePath('src/migrations'),
  },
} as Parameters<typeof MikroORM.init>[0];
