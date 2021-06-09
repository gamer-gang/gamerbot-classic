import path from 'path';

/** Resolve a directory/file from the project root. */
export const resolvePath = (dir: string): string => {
  return path.resolve(__dirname, '../../../..', dir);
};
