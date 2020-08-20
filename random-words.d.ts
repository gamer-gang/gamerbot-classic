// these are probably wrong


declare module 'random-words' {
  function words(): string;
  function words(num: number): string | string[];
  function words(options: Partial<RandomWordsOptions>): string | string[];

  export = words;

  interface RandomWordsOptions {
    exactly: number;
    min: number;
    max: number;
    wordsPerString: number;
    formatter: (word: string) => string;
    join: boolean;
    maxLength: number;
    separator: string;
  }
}
