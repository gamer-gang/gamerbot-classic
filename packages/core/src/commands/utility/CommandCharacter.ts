import { Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import { ChatCommand, CommandDocs, CommandOptions } from '..';
import { APIMessage, CommandEvent } from '../../models/CommandEvent';

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
    const input = (
      event.isInteraction() ? event.options.getString('character', true) : event.args
    ).trim();

    if (stringLength(input) !== 1)
      return event.reply(Embed.error('Input must be exactly one character').ephemeral());

    const codePoints = input
      .split('')
      .map(char => char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'));

    const embed = new Embed({
      title: 'Character ' + input,
      description: 'https://graphemica.com/' + input,
    })
      .addField('Code points', codePoints.map(codePoint => 'U+' + codePoint).join(', '))
      .addField(
        'Input',
        `JS: ${codePoints.map(c => '\\u' + c.toLowerCase()).join('')}\nURL: ${encodeURIComponent(
          input
        )}\nHTML: ${codePoints.map(c => `&#x${c};`).join('')}`
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
