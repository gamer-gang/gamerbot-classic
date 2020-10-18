import { MessageOptions } from 'discord.js';

import { Embed } from './embed';

export const hasMentions = (content: string, includeSingleUser = true): boolean =>
  content.includes('@everyone') ||
  content.includes('@here') ||
  (includeSingleUser ? /<@!\d{18}>/g.test(content) : false);

export const parseDiscohookJSON = (json: string): MessageOptions => {
  const data = JSON.parse(json) as Discohook.Message;

  let embed: Embed | undefined = undefined;

  if (data.embeds) {
    if (data.embeds.length > 1) throw 'max 1 embed';

    const {
      author,
      color,
      description,
      fields,
      footer,
      image,
      thumbnail,
      title,
      url,
    } = data.embeds[0];

    embed = new Embed({ description, fields, footer, image, thumbnail, url, title });
    if (author) embed.author = author;
    if (color) embed.color = color;
  }

  return {
    content: data.content,
    embed,
  };
};
