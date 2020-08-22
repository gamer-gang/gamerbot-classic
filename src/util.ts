import * as path from 'path';

/** Resolve a directory/file from the project root. */
export function resolvePath(dir: string): string {
  return path.resolve(__dirname, '..', dir);
}

/** Convert a `Map<string, any>` to a plain object. */
export function mapToObject<T>(map: Map<string, T>): { [key: string]: T } {
  const obj: { [key: string]: T } = Object.create(null);
  for (const [key, value] of map) {
    // Don’t escape the key '__proto__'
    // can cause problems on older engines
    obj[key] = value;
  }
  return obj;
}

/** Convert a plain object to a `Map<string, any>`. */
export function objectToMap<T>(obj: { [key: string]: T }): Map<string, T> {
  const map = new Map<string, T>();
  for (const [key, value] of Object.entries(obj)) {
    map.set(key, value);
  }
  return map;
}

export const updateFlags = (flags: Record<string, number>, args: string[]) => {
  for (const flag in flags) {
    if (Object.prototype.hasOwnProperty.call(flags, flag)) {
      delete flags[flag];
    }
  }

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--') {
      args.splice(i, 1);
      break;
    }
    if (args[i].startsWith('-')) flags[args[i]] = i;
  }
};

export const hasFlags = (flags: Record<string, number>, names: string[]) => {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(flags, name)) {
      return true;
    }
  }
  return false;
};

export const spliceFlag = (
  flags: Record<string, number>,
  args: string[],
  name: string,
  valueAfter = false
) => {
  if (flags[name] !== undefined) {
    const index = args.findIndex(v => v === name);
    if (valueAfter) {
      updateFlags(flags, args);
      return args.splice(index, 2)[1];
    } else {
      args.splice(index, 1);
    }
  }
  updateFlags(flags, args);
  return;
};

export const hasMentions = (content: string, includeSingleUser = true) =>
  content.includes('@everyone') ||
  content.includes('@here') ||
  (includeSingleUser ? /<@!\d{18}>/g.test(content) : false);
