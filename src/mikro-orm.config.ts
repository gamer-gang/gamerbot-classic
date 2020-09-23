import { MigrationObject, MikroORM } from '@mikro-orm/core';
import { basename } from 'path';

import { resolvePath } from './util';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getEntities = (): any[] => {
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
  // migrations: {
  //   path: path.join(__dirname, './migrations'), // path to the folder with migrations
  //   pattern: /^[\w-]+\d+\.[tj]s$/, // regex pattern for the migration files
  // },
  migrations: { migrationsList: getMigrations() },
} as Parameters<typeof MikroORM.init>[0];
