import { Message } from 'discord.js';
import * as yaml from 'js-yaml';
import _ = require('lodash');
import * as randomstring from 'randomstring';

import { Command } from '..';
import { Embed } from '../../embed';
import { CmdArgs, DiceObject, GameReactionCollector, LiarsDiceGame } from '../../types';
import { hasFlags, spliceFlag } from '../../util';

class Dice {
  value!: number;

  constructor(public sides: number = 6) {
    this.roll();
  }

  setSides(n: number) {
    this.sides = n;

    return this;
  }

  roll() {
    this.value = Math.floor(Math.random() * this.sides) + 1;
    return this.value;
  }

  static array(amount: number, sides: number) {
    const output: Dice[] = [];

    for (let i = 0; i < amount; i++) {
      output.push(new Dice(sides));
    }

    return output;
  }

  static fromObject({ sides, value }: DiceObject) {
    const output = new Dice(sides);
    output.value = value;
    return output;
  }

  toObject(): DiceObject {
    return { sides: this.sides, value: this.value };
  }
}

export class CommandLiarsDice implements Command {
  cmd = 'liarsdice';
  docs = [
    {
      usage: 'liarsdice -c, --create [-d diceAmount=5] [-n diceSides=6]',
      description: 'create dice game',
    },
    {
      usage: 'liarsdice -s, --start',
      description: 'start dice game (game creator only)',
    },
  ];

  makeGameCode(existing: string[]): string {
    let code: string;

    do {
      code =
        'ld-' +
        randomstring.generate({
          length: 4,
          charset: '1234567890',
        });
    } while (existing.includes(code));

    return code;
  }

  inGame(games: Record<string, LiarsDiceGame>, playerId: string): string | null {
    for (const code of Object.keys(games)) {
      if (Object.keys(games[code].players).some(id => playerId === id)) return code;
    }
    return null;
  }

  isInGame(games: Record<string, LiarsDiceGame>, playerId: string): boolean {
    for (const code of Object.keys(games)) {
      if (Object.keys(games[code].players).some(id => playerId === id)) return true;
    }
    return false;
  }

  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, gameStore, flags, args, client } = cmdArgs;
    const { liarsDice } = gameStore.get(msg.guild?.id as string);

    const unrecognized = Object.keys(flags).filter(
      v => !'c|-create|s|-start|n|d|-state'.split('|').includes(v.substr(1))
    );
    if (unrecognized.length > 0)
      return msg.channel.send(`unrecognized flag(s): \`${unrecognized.join('`, `')}\``);

    if (hasFlags(flags, ['--state'])) {
      try {
        const cloned = _.cloneDeep(liarsDice);
        for (const key of Object.keys(cloned)) {
          delete cloned[key].reactionCollector;
        }
        console.log(JSON.stringify(cloned));
        const state = yaml.dump(cloned);
        const embed = new Embed()
          .setTitle('liars dice state')
          .setDescription('```yaml\n' + state + '\n```');
        return msg.channel.send(embed);
      } catch (err) {
        console.log(err);
        return msg.channel.send('got error: \n```\n' + err + '\n```');
      }
    }

    if (hasFlags(flags, ['-s', '--start'])) {
      const gameCode = this.inGame(liarsDice, msg.author?.id as string);

      if (!gameCode) return msg.channel.send('not in game');
      if (liarsDice[gameCode].creatorId !== (msg.author?.id as string))
        return msg.channel.send(`ask <@!${liarsDice[gameCode].creatorId}> to start the game`);
      if (Object.keys(liarsDice[gameCode].players).length < 2)
        return msg.channel.send('need more players');

      liarsDice[gameCode].reactionCollector?.stop('creator called for start');

      return;
    }

    // create game
    if (!hasFlags(flags, ['-c', '--create'])) return;

    let diceAmount = 5;
    let diceSides = 6;

    if (hasFlags(flags, ['-d'])) {
      const providedDiceAmount = spliceFlag(flags, args, '-d', true);
      if (!providedDiceAmount) return msg.channel.send('need # of dice after `-d`');

      const parsed = parseInt(providedDiceAmount);
      if (isNaN(parseInt(providedDiceAmount))) return msg.channel.send('invalid # of dice');
      if (parsed > 10 || parsed < 1) return msg.channel.send('1-10 dice allowed');

      diceAmount = parsed;
    }

    if (hasFlags(flags, ['-n'])) {
      const providedDiceSides = spliceFlag(flags, args, '-n', true);
      if (!providedDiceSides) return msg.channel.send('need # of dice sides safter `-n`');

      const parsed = parseInt(providedDiceSides);
      if (isNaN(parsed)) return msg.channel.send('invalid # of sides');
      if (parsed > 8 || parsed < 4) return msg.channel.send('4-8 dice sides allowed');

      diceSides = parsed;
    }

    // only include if not in game already
    if (this.isInGame(liarsDice, msg.author?.id as string))
      return msg.channel.send('u are smelly and in a game already');

    // generate new game
    const code = this.makeGameCode(Object.keys(liarsDice));

    // make embed
    let timeLeft = 120;
    const playerTags: string[] = [];
    playerTags.push(msg.author?.tag as string);
    const embed = this.makeJoinEmbed({
      gameCode: code,
      timeLeft,
      playerTags,
      diceAmount,
      diceSides,
    });

    const embedMessage = await msg.channel.send(embed);
    embedMessage.react('🎲');

    // set 2 min timer
    const interval = setInterval(() => {
      embedMessage.edit(
        this.makeJoinEmbed({
          gameCode: code,
          timeLeft: timeLeft -= 5,
          playerTags,
          diceAmount,
          diceSides,
        })
      );
    }, 5000);

    // create reaction collector
    const collector = embedMessage.createReactionCollector(
      ({ emoji }, user) =>
        emoji.name === '🎲' && ![msg.author?.id, client.user?.id].includes(user.id),
      { time: 120000, dispose: true }
    ) as GameReactionCollector;

    collector.on('collect', (_, user) => {
      liarsDice[code].players[user.id] = { dice: Dice.array(diceAmount, diceSides) };
      playerTags.push(user.tag);
      embedMessage.edit(
        this.makeJoinEmbed({ gameCode: code, timeLeft, playerTags, diceAmount, diceSides })
      );
    });

    collector.on('remove', (_, user) => {
      delete liarsDice[code].players[user.id];
      playerTags.splice(playerTags.indexOf(user.tag), 1);
      embedMessage.edit(
        this.makeJoinEmbed({ gameCode: code, timeLeft, playerTags, diceAmount, diceSides })
      );
    });

    collector.on('end', () => {
      if (Object.keys(liarsDice[code].players).length < 2)
        return msg.channel.send('not enough players to start, aborting');

      clearInterval(interval);
      embedMessage.edit(
        this.makeJoinEmbed({ gameCode: code, timeLeft: 0, playerTags, diceAmount, diceSides })
      );
      // do game thing
      msg.channel.send(`"starting game ${code} now"`);
      msg.channel.send(
        Object.keys(liarsDice[code].players)
          .map(id => `<@!${id}>`)
          .join(' ')
      );
    });

    collector.gameCode = code;

    liarsDice[code] = {
      players: {},
      metadata: { diceAmount, diceSides },
      creatorId: msg.author?.id as string,
      reactionCollector: collector,
    };

    liarsDice[code].players[msg.author?.id as string] = {
      dice: Dice.array(diceAmount, diceSides),
    };
  }

  makeJoinEmbed({
    gameCode,
    timeLeft,
    playerTags,
    diceAmount,
    diceSides,
  }: {
    gameCode: string;
    timeLeft: number;
    playerTags: string[];
    diceAmount: number;
    diceSides: number;
  }): Embed {
    return new Embed()
      .setTitle('liars dice or something idk im not gamer')
      .setDescription('react with 🎲 to join')
      .addField('game code', `\`${gameCode}\``, true)
      .addField('time to join', `${timeLeft} seconds`, true)
      .addField(
        'dice',
        `${diceAmount} ${diceSides}-sided ${diceAmount === 1 ? 'die' : 'dice'}`,
        true
      )
      .addField('how 2 play?', 'type in `dice -how2play`', false)
      .addField('players', playerTags.join(', '))
      .setFooter('do ctrl + alt + ➡️ or ctrl + k to switch between dms and server channels');
  }
}
