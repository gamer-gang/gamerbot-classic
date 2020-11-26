declare module 'cowsay2' {
  /** Options for cowsay/think. */
  export interface CowOptions {
    /** Text to say/think */
    text: string;
    /** Wrap text at specified column. */
    W?: number;
    /** Cow name */
    f?: string;
    /** Enable random cow */
    r?: boolean;
    /** String to use for the eyes */
    e?: string;
    /** String to use for tounge */
    T?: string;
    /** Enable borg cow. */
    b?: boolean;
    /** Enable dead cow. */
    d?: boolean;
    /** Enable greedy cow. */
    g?: boolean;
    /** Enable paranoia cow. */
    p?: boolean;
    /** Enable stoned cow. */
    s?: boolean;
    /** Enable tired cow. */
    t?: boolean;
    /** Enable youthful cow. */
    w?: boolean;
    /** Enable wired cow. */
    y?: boolean;
  }

  /**
   * @returns a list of cow names from the cows folder without the .cow extension.
   * @example
   * ```
   * const getCows =(error, cowNames: string[]): void => {
   *   if (error) {
   *     return console.log(`Error getting cow names: ${error.message}`);
   *   }
   *   console.log(`Number of cows available: ${cow_names.length}`);
   * }
   *
   * cowsay.list(getCows);
   * ```
   */
  export function list(
    callback: (error: NodeJS.ErrnoException, cowNames: string[]) => void
  ): Promise<string[]>;
  /**
   * @example
   * ```
   * // custom cow and face
   * cowsay.say({
   *   text: 'Hello world!',
   *   e: '^^', // eyes
   *   T: 'U ', // tongue
   *   f: 'USA' // name of the cow from `cows` folder
   * })
   *
   * // using a random cow
   * cowsay.say({
   *   text: 'Hello world!',
   *   e: 'xx', // eyes
   *   r: true, // random mode - use a random cow.
   * })
   *
   * // using a mode
   * cowsay.say({
   *   text: 'Hello world!',
   *   y: true, // youthful
   * })
   * ```
   */
  export function say(options: CowOptions): string;

  /**
   * @example
   * ```
   * // custom cow and face
   * cowsay.think({
   *   text: 'Hello world!',
   *   e: '^^', // eyes
   *   T: 'U ', // tongue
   *   f: 'USA' // name of the cow from `cows` folder
   * })
   *
   * // using a random cow
   * cowsay.think({
   *   text: 'Hello world!',
   *   e: 'xx', // eyes
   *   r: true, // random mode - use a random cow.
   * })
   *
   * // using a mode
   * cowsay.think({
   *   text: 'Hello world!',
   *   y: true, // using y mode - youthful mode
   * })
   * ```
   */
  export function think(options: CowOptions): string;
}
