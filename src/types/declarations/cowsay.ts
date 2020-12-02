declare module 'cowsay2' {
  /** Options for cowsay/think. */
  export interface CowOptions {
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
  export function say(text: string, options: CowOptions): string;
  export function think(text: string, options: CowOptions): string;
}
