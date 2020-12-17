import { FileOptions, MessageOptions } from 'discord.js';
import _ from 'lodash';
import moment from 'moment';

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
export const codeBlock = (content?: unknown, language?: string): string => `\`\`\`${language ?? ''}
${content}
\`\`\``;

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
  const dec = moment(moment.now()).month() === 11;
  const dev = process.env.NODE_ENV === 'development';

  const path = dev
    ? resolvePath('assets/hexagon-dev.png')
    : resolvePath(`assets/hexagon${dec ? '-hat' : ''}.png`);

  return {
    attachment: path,
    name: 'hexagon.png',
  };
};
