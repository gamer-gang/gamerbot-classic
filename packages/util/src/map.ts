/** Convert a `Map<string, any>` to a plain object. */
export const mapToObject = <T>(map: Map<string, T>): { [key: string]: T } => {
  const obj: { [key: string]: T } = Object.create(null);
  for (const [key, value] of map) {
    // Don’t escape the key '__proto__'
    // can cause problems on older engines
    obj[key] = value;
  }
  return obj;
};

/** Convert a plain object to a `Map<string, any>`. */
export const objectToMap = <T>(obj: { [key: string]: T }): Map<string, T> => {
  const map = new Map<string, T>();
  for (const [key, value] of Object.entries(obj)) {
    map.set(key, value);
  }
  return map;
};
