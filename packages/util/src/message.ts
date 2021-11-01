import '@gamerbot/types';
import { FileOptions, MessageOptions } from 'discord.js';
import _ from 'lodash';
import { DateTime } from 'luxon';
import { Gamerbot } from './client';
import { Embed, EmbedOptions } from './embed';
import { resolvePath } from './path';

export const hasMentions = (content: string, includeSingleUser = true): boolean =>
  content.includes('@everyone') ||
  content.includes('@here') ||
  (includeSingleUser ? /<@!?\d{18}>/g.test(content) : false);

export const sanitize = (content?: string): string =>
  content // comment so that replaces are wrapped
    ?.replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/`/g, '\\`') ?? '';

// eslint-disable-next-line
// export const codeBlock = (content?: unknown, language?: string): string => {
//   let cont: unknown;
//   if (((m => !!(m as Error).stack) as (m: unknown) => m is Error)(content))
//     cont = content.stack ?? content.toString();
//   else cont = content;
//   return `\`\`\`${language ?? ''}\n${cont}\n\`\`\``;
// };

export const listify = (array: unknown[]): string => {
  switch (array.length) {
    case 0:
      return '';
    case 1:
      return `${array[0]}`;
    case 2:
      return `${array[0]} and ${array[1]}`;
    default:
      return `${_.dropRight(array).join(', ')}, and ${_.last(array)}`;
  }
};

export const parseDiscohookJSON = (json: string): MessageOptions => {
  const data = JSON.parse(json) as Discohook.Message;

  if (!data) throw 'Empty message';

  let embed: Embed | undefined = undefined;

  if (data.embeds) {
    if (data.embeds.length > 1) throw 'Max 1 embed';

    const embedData = data.embeds[0] as Discohook.Embed & EmbedOptions;

    embed = new Embed(embedData);
  }

  return {
    content: data.content,
    embeds: embed ? [embed] : undefined,
  };
};

export const getProfilePicture = (client: Gamerbot): FileOptions => {
  const dec = DateTime.now().month === 12;

  const path = client.devMode
    ? resolvePath('assets/hexagon-dev.png')
    : resolvePath(`assets/hexagon${dec ? '-hat' : ''}.png`);

  return {
    attachment: path,
    name: 'hexagon.png',
  };
};

const mags = ' KMGTPEZY';

export const byteSize = (bytes: number, precision = 2): string => {
  const magnitude = Math.min((Math.log(bytes) / Math.log(1024)) | 0, mags.length - 1);
  const result = bytes / Math.pow(1024, magnitude);
  const suffix = mags[magnitude].trim() + 'B';
  return result.toFixed(precision) + suffix;
};

export const insertUuidDashes = (uuid: string): string =>
  `${uuid.slice(0, 8)}-${uuid.slice(8, 12)}-${uuid.slice(12, 16)}-${uuid.slice(
    16,
    20
  )}-${uuid.slice(20, 32)}`;

const CONTROL =
  '(?:' + ['\\|\\|', '\\&\\&', ';;', '\\|\\&', '\\<\\(', '>>', '>\\&', '[&;()|<>]'].join('|') + ')';
// const META = '|&;()<> \\t';
const META = '';
const BAREWORD = '(\\\\[\'"' + META + ']|[^\\s\'"' + META + '])+';
const SINGLE_QUOTE = '"((\\\\"|[^"])*?)"';
const DOUBLE_QUOTE = "'((\\\\'|[^'])*?)'";

export const parseQuotes = (s: string): string[] => {
  const chunker = new RegExp(
    [
      // '(' + CONTROL + ')', // control chars
      '(' + BAREWORD + '|' + SINGLE_QUOTE + '|' + DOUBLE_QUOTE + ')*',
    ].join('|'),
    'g'
  );
  const chunks = s.match(chunker)?.filter(Boolean);

  if (!chunks) return [];
  return (
    chunks
      .map<string>((s: string, index: number) => {
        const singleQuote = "'";
        const doubleQuote = '"';
        const backslash = '\\';
        let quote: boolean | string = false;
        let escaped = false;
        let output = '';
        // let isGlob = false;

        for (let chunkIndex = 0; chunkIndex < s.length; chunkIndex++) {
          let char = s.charAt(chunkIndex);

          if (escaped) {
            output += char;
            escaped = false;
          } else if (quote) {
            if (char === quote) quote = false;
            else if (quote == singleQuote) output += char;
            else {
              // Double quote
              if (char === backslash) {
                chunkIndex += 1;
                char = s.charAt(chunkIndex);
                if (char === doubleQuote || char === backslash) output += char;
                else output += backslash + char;
              } else output += char;
            }
          } else if (char === doubleQuote || char === singleQuote) quote = char;
          else if (char === backslash) escaped = true;
          else output += char;
        }

        return output;
      })
      // finalize parsed aruments
      .reduce((prev: string[], arg: undefined | string) => {
        if (arg === undefined) return prev;
        return [...prev, arg];
      }, [] as string[])
  );
};
