import { EventEmitter } from 'events';
import * as fse from 'fs-extra';
import * as yaml from 'js-yaml';
import { mapToObject, objectToMap } from './util';
import * as _ from 'lodash/fp';
import { Dir } from 'fs-extra';

export interface StoreOptions {
  /** Path to file to store data in. */
  path?: string;
  /**
   * Whether to read the file (at `path`) immediately on instantiation.
   *
   * Default: `false`
   */
  readImmediately?: boolean;
  /**
   * Whether to write to disk every time `store.set()` is called.
   *
   * Default: `false`
   */
  writeOnSet?: boolean;
  /**
   * Store the data as JSON or YAML.
   *
   * Default: `yaml`
   */
  dataLanguage?: 'json' | 'yaml';
}

export class Store<T> extends EventEmitter {
  private map = new Map<string, T>();

  defaultOptions: StoreOptions = {
    readImmediately: false,
    writeOnSet: false,
    dataLanguage: 'yaml',
  };

  constructor(public options: StoreOptions) {
    super();
    options = _.merge(this.defaultOptions, options);
    options.readImmediately && this.readFile();
    if (options.writeOnSet) {
      this.addListener('set', () => {
        this.writeFile();
      });
    }
  }
  /**
   * Read the contents of `this.path` and interpret as JSON/YAML;
   * if file read throws an error, will set to an empty map instead.
   * Emits `read` once complete.
   */
  readFile(): void {
    try {
      const raw = fse.readFileSync(this.options.path as string, 'utf-8');
      const data =
        this.options.dataLanguage === 'json'
          ? (JSON.parse(raw) as { [key: string]: T })
          : yaml.load(raw);
      this.map = objectToMap<T>(data) as Map<string, T>;
      this.emit('read');
    } catch (err) {
      const dir = (/.*[\\/]/g.exec(this.options.path as string) as RegExpExecArray)[0];
      fse.mkdirpSync(dir);
      this.map = new Map<string, T>();
      this.emit('read');
    }
  }
  async clear(): Promise<void> {
    this.map.clear();
    await this.writeFile();
    this.emit('clear');
  }
  async writeFile(): Promise<void> {
    const data =
      this.options.dataLanguage === 'json'
        ? JSON.stringify(mapToObject(this.map))
        : yaml.dump(mapToObject(this.map));
    await fse.writeFile(this.options.path as string, data);
    this.emit('write');
  }
  set(key: string, value: T): void {
    this.map.set(key, value);
    this.emit('set');
  }
  setIfUnset(key: string, value: T): void {
    if (this.has(key)) return;
    this.set(key, value);
  }
  get(key: string): T {
    this.emit('get');
    return this.map.get(key) as T;
  }
  delete(key: string): void {
    this.map.delete(key);
    this.emit('set');
  }
  get entries(): IterableIterator<[string, T]> {
    return this.map.entries();
  }
  get keys(): IterableIterator<string> {
    return this.map.keys();
  }
  get values(): IterableIterator<T> {
    return this.map.values();
  }
  has(key: string): boolean {
    return this.map.has(key);
  }
}
