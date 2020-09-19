export const updateFlags = (flags: Record<string, number>, args: string[]): void => {
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

export const hasFlags = (flags: Record<string, number>, names: string[]): boolean => {
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
): string | undefined => {
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
