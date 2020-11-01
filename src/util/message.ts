import { MessageOptions } from 'discord.js';

import { Embed, EmbedOptions } from './embed';

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
export const codeBlock = (content?: any, language?: string): string => `\`\`\`${language}
${content}
\`\`\``;

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
