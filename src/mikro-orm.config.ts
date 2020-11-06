import { MigrationObject, MikroORM } from '@mikro-orm/core';
import { SqlHighlighter } from '@mikro-orm/sql-highlighter';
import dotenv from 'dotenv';
import fs from 'fs';
import path, { basename } from 'path';

import { dbLogger } from './providers';
import { resolvePath } from './util';

dotenv.config({ path: resolvePath('.env') });

const getEntities = () => {
  let modules;
  if (process.env.WEBPACK) {
    modules = require.context('./entities', true, /\.ts$/);
    modules = modules.keys().map(r => modules(r));
  } else {
    modules = fs
      .readdirSync(resolvePath('src/entities'))
      .map(file => require(`./entities/${file}`));
  }

  return modules.flatMap(mod => Object.keys(mod).map(className => mod[className]));
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
      name => <MigrationObject>{ name: basename(name), class: Object.values(modules[name])[0] }
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
  debug: process.env.NODE_ENV === 'development',
  logger: msg => dbLogger.debug(msg),
  highlighter: new SqlHighlighter(),
  baseDir: resolvePath('.'),
  discovery: { disableDynamicFileAccess: true },
  migrations: { migrationsList: getMigrations(), path: resolvePath('src/migrations') },
} as Parameters<typeof MikroORM.init>[0];
