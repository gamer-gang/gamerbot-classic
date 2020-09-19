import { MigrationObject, MikroORM } from '@mikro-orm/core';
import { basename } from 'path';

import { resolvePath } from './util';

const getEntities = () => {
  const modules = require.context('./entities', true, /\.ts$/);

  return modules
    .keys()
    .map(r => modules(r))
    .flatMap(mod => Object.keys(mod).map(className => mod[className]));
};

const getMigrations = () => {
  const modules = require.context('./migrations', false, /\.ts$/);

  return modules
    .keys()
    .map(name => <MigrationObject>{ name: basename(name), class: Object.values(modules(name))[0] });
};

export default {
  entities: getEntities(),
  dbName: 'gamerbot',
  type: 'postgresql',
  debug: process.env.NODE_ENV === 'development',
  baseDir: resolvePath('.'),
  discovery: { disableDynamicFileAccess: true },
  migrations: { migrationsList: getMigrations() },
} as Parameters<typeof MikroORM.init>[0];
