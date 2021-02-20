import { FileOptions, MessageOptions } from 'discord.js';
import _ from 'lodash';
import { DateTime } from 'luxon';
import { Embed, EmbedOptions } from './embed';
import { resolvePath } from './path';

export const hasMentions = (content: string, includeSingleUser = true): boolean =>
  content.includes('@everyone') ||
  content.includes('@here') ||
  (includeSingleUser ? /<@!\d{18}>/g.test(content) : false);

export const sanitize = (content?: string): string =>
  content // comment so that replaces are wrapped
    ?.replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/`/g, '\\`') ?? '';

// eslint-disable-next-line
export const codeBlock = (content?: unknown, language?: string): string => {
  let cont: unknown;
  if (((m => !!(m as Error).stack) as (m: unknown) => m is Error)(content))
    cont = content.stack ?? content.toString();
  else cont = content;
  return `\`\`\`${language ?? ''}\n${cont}\n\`\`\``;
};

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

  let embed: Embed | undefined = undefined;

  if (data.embeds) {
    if (data.embeds.length > 1) throw 'max 1 embed';

    const embedData = data.embeds[0] as Discohook.Embed & EmbedOptions;

    embed = new Embed(embedData);
  }

  return {
    content: data.content,
    embed,
  };
};

export const getProfilePicture = (): FileOptions => {
  const dec = DateTime.now().month === 11;
  const dev = process.env.NODE_ENV === 'development';

  const path = dev
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
