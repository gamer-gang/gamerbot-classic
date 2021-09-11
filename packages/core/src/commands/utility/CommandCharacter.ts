/// <reference types="@gamerbot/types/lib/unicode" />

import { Embed } from '@gamerbot/util';
import { stripIndents } from 'common-tags';
import { Message } from 'discord.js';
import emojiRegex from 'emoji-regex';
import { Character } from 'unicode/category';
import { ChatCommand, CommandDocs, CommandOptions } from '..';
import { APIMessage, CommandEvent } from '../../models/CommandEvent';

const unicode = import('unicode/category');

export class CommandCharacter extends ChatCommand {
  name = ['character', 'ch'];
  help: CommandDocs = [
    {
      usage: 'character <character>',
      description: 'display info about a character',
    },
  ];
  data: CommandOptions = {
    description: 'Display info about a character',
    options: [
      {
        name: 'character',
        description: 'Character to display info (must be 1 unicode character)',
        type: 'STRING',
        required: true,
      },
    ],
  };
  async execute(event: CommandEvent): Promise<void | Message | APIMessage> {
    let input = (
      event.isInteraction() ? event.options.getString('character', true) : event.args
    ).trim();

    const codePointRegex = /^(?:U\+)?([0-9a-f]{4,6})$/i;

    if (codePointRegex.test(input)) {
      // looks like a code point
      const hex = codePointRegex.exec(input)![1];
      input = String.fromCodePoint(parseInt(hex, 16));
    }

    const error = () => event.reply(Embed.error('Input must be exactly one character').ephemeral());

    if (stringLength(input) !== 1) return error();

    let codePoint = '';
    let charCodes: string[] = [];

    // must use for..of because a .split('').map does not handle UTF-16 surrogate pairs correctly
    for (const character of input) {
      // if variable is already truthy, we already have one character already
      if (codePoint) return error();
      const number = character.codePointAt(0)!;
      codePoint = number.toString(16).padStart(4, '0');
      if (number > 0xffff) {
        // surrogate pair
        charCodes = character.split('').map(code => code.charCodeAt(0).toString(16));
      }
    }

    // no character
    if (!codePoint) return error();

    let data: Character | undefined;

    const categories = await unicode;
    for (const k of Object.keys(categories)) {
      if (k === 'default') continue;
      const potentialData =
        categories[k as Exclude<keyof typeof categories, 'default'>][input.codePointAt(0)!];
      if (potentialData) {
        data = potentialData;
        break;
      }
    }

    const embed = new Embed({
      author: data ? { name: 'Character ' + input } : undefined,
      title: data
        ? `${data.name}${data.unicode_name ? ` (${data.unicode_name})` : ''}`
        : 'Character ' + input,
      description: stripIndents`
        ${emojiRegex().test(input) ? input + '\n' : ''}
        https://graphemica.com/${encodeURIComponent(input)}`,
    }).addField('Code point', `U+${codePoint.toUpperCase()}`, true);

    if (charCodes.length)
      embed.addField('Surrogate pair', charCodes.map(c => 'U+' + c.toUpperCase()).join(', '), true);

    if (data) embed.addField('Category', data.category, true);

    embed.addField(
      'Input',
      stripIndents`
        JS: \`\\u${!charCodes.length ? codePoint : `{${codePoint}}`}\`
        URL: \`${encodeURIComponent(input)}\`
        HTML: \`&#x${codePoint};\` or \`&#${parseInt(codePoint, 16)};\`
      `
    );

    event.reply(embed);
  }
}

function charRegex() {
  // Used to compose unicode character classes.
  const astralRange = '\\ud800-\\udfff';
  const comboMarksRange = '\\u0300-\\u036f';
  const comboHalfMarksRange = '\\ufe20-\\ufe2f';
  const comboSymbolsRange = '\\u20d0-\\u20ff';
  const comboMarksExtendedRange = '\\u1ab0-\\u1aff';
  const comboMarksSupplementRange = '\\u1dc0-\\u1dff';
  const comboRange =
    comboMarksRange +
    comboHalfMarksRange +
    comboSymbolsRange +
    comboMarksExtendedRange +
    comboMarksSupplementRange;
  const varRange = '\\ufe0e\\ufe0f';

  // Used to compose unicode capture groups.
  const astral = `[${astralRange}]`;
  const combo = `[${comboRange}]`;
  const fitz = '\\ud83c[\\udffb-\\udfff]';
  const modifier = `(?:${combo}|${fitz})`;
  const nonAstral = `[^${astralRange}]`;
  const regional = '(?:\\ud83c[\\udde6-\\uddff]){2}';
  const surrogatePair = '[\\ud800-\\udbff][\\udc00-\\udfff]';
  const zeroWidthJoiner = '\\u200d';
  const blackFlag =
    '(?:\\ud83c\\udff4\\udb40\\udc67\\udb40\\udc62\\udb40(?:\\udc65|\\udc73|\\udc77)\\udb40(?:\\udc6e|\\udc63|\\udc6c)\\udb40(?:\\udc67|\\udc74|\\udc73)\\udb40\\udc7f)';

  // Used to compose unicode regexes.
  const optModifier = `${modifier}?`;
  const optVar = `[${varRange}]?`;
  const optJoin = `(?:${zeroWidthJoiner}(?:${[nonAstral, regional, surrogatePair].join('|')})${
    optVar + optModifier
  })*`;
  const seq = optVar + optModifier + optJoin;
  const nonAstralCombo = `${nonAstral}${combo}?`;
  const symbol = `(?:${[blackFlag, nonAstralCombo, combo, regional, surrogatePair, astral].join(
    '|'
  )})`;

  // Used to match [string symbols](https://mathiasbynens.be/notes/javascript-unicode).
  return new RegExp(`${fitz}(?=${fitz})|${symbol + seq}`, 'g');
}

const stringLength = (string: string) => {
  if (string === '') {
    return 0;
  }

  return string.match(charRegex())!.length;
};
