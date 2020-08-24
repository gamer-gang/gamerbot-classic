import { Command } from '..';
import { Embed } from '../../embed';
import { CmdArgs, GameReactionCollector } from '../../types';
import { hasFlags, spliceFlag } from '../../util';
import { inspect } from 'util';
import * as yaml from 'js-yaml';
import * as _ from 'lodash';
import { User, Guild } from 'discord.js';
import { LiarsDiceManager } from '../../gamemanagers/liarsdicemanager';
import { Dice } from '../../gamemanagers/common';

const reactionCollectors: GameReactionCollector[] = [];

export class CommandLiarsDice implements Command {
  cmd = 'dice';
  docs = [
    {
      usage: 'liarsdice -c, --create [-d diceAmount=5] [-n diceSides=6]',
      description: 'create dice game',
    },
    {
      usage: 'liarsdice -s, --start',
      description: 'start dice game (game creator only)',
    },
    {
      usage: 'liarsdice --cancel',
      description: 'cancel dice game (game creator only)',
    },
  ];

  async executor(cmdArgs: CmdArgs) {
    const { msg, flags, args, client } = cmdArgs;

    const manager = new LiarsDiceManager(msg.guild!.id);

    const unrecognized = Object.keys(flags).filter(
      v => !'c|-create|s|-start|n|d|-state|i|-cancel'.split('|').includes(v.substr(1))
    );
    if (unrecognized.length > 0)
      return msg.channel.send(`unrecognized flag(s): \`${unrecognized.join('`, `')}\``);

    if (hasFlags(flags, ['--state', '-i'])) {
      try {
        const state = yaml.dump(manager.liarsDice)
        const embed = new Embed()
          .setTitle('liars dice state')
          .setDescription('```yaml\n' + state + '\n```');
        return msg.channel.send(embed);
      } catch (err) {
        console.log(err);
        return msg.channel.send('got error: \n```\n' + err + '\n```');
      }
    }

    if (hasFlags(flags, ['--cancel'])) {
      const code = manager.inGame(msg.author!.id);

      if (!code) return msg.channel.send('not in game');
      if (manager.get(code).creatorId !== msg.author!.id)
        return msg.channel.send(`only game creator can cancel`);

      reactionCollectors.find(c => c.gameCode === code)?.stop('cancel');

      msg.channel.send('cancelled');

      return;
    }

    if (hasFlags(flags, ['-s', '--start'])) {
      const code = manager.inGame(msg.author!.id);
      if (!code) return msg.channel.send('not in game');

      const game = manager.get(code);
      if (game.creatorId !== msg.author!.id)
        return msg.channel.send(`ask <@!${game.creatorId}> to start the game`);
      if (Object.keys(game.players).length < 2)
        return msg.channel.send('need more players');

      return reactionCollectors.find(c => c.gameCode === code)?.stop('start');
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
    if (manager.isInGame(msg.author!.id))
      return msg.channel.send('u are smelly and in a game already');

    // generate new game
    const code = manager.makeGameCode();

    // make embed
    let timeLeft = 120;
    const playerTags: string[] = [msg.author!.tag];

    const embedMessage = await msg.channel.send(this.makeJoinEmbed({
      gameCode: code,
      timeLeft,
      playerTags,
      diceAmount,
      diceSides,
    }));

    embedMessage.react('🎲');

    const updateEmbed = (time = timeLeft) => embedMessage.edit(
      this.makeJoinEmbed({ gameCode: code, timeLeft: time, playerTags, diceAmount, diceSides })
    );

    // set 2 min timer
    const interval = setInterval(() => updateEmbed(timeLeft -= 5), 5000);

    // create reaction collector
    const collector = embedMessage.createReactionCollector(
      ({ emoji }, user) =>
        emoji.name === '🎲' && ![msg.author!.id, client.user!.id].includes(user.id),
      { time: 120000, dispose: true }
    ) as GameReactionCollector;

    collector
      .on('collect', (_, user: User) => {
        manager.get(code).players[user.id] = { dice: Dice.array(diceAmount, diceSides) };
        playerTags.push(user.tag);
        updateEmbed();
      })
      .on('remove', (_, user: User) => {
        delete manager.get(code).players[user.id];
        playerTags.splice(playerTags.indexOf(user.tag), 1);
        updateEmbed();
      })
      .on('end', (_, reason) => {
        clearInterval(interval);
        updateEmbed(0);

        if (reason === 'cancel') return;

        const game = manager.get(code);

        if (Object.keys(game.players).length < 2)
          return msg.channel.send('not enough players to start, aborting');

        // do game thing
        msg.channel.send(`"starting game ${code} now"`);
        msg.channel.send(
          Object.keys(game.players)
            .map(id => `<@!${id}>`)
            .join(' ')
        );

        // Object.keys(game.players).forEach() ---------------------------------------------------------------------------
      });

    collector.gameCode = code;

    manager.setGame(code, {
      players: {},
      metadata: { diceAmount, diceSides },
      creatorId: msg.author!.id,
    })
    manager.get(code).players[msg.author!.id] = {
      dice: Dice.array(diceAmount, diceSides),
    };

    manager.write();

    reactionCollectors.push(collector);
  }

  makeJoinEmbed(opts: {
    gameCode: string;
    timeLeft: number;
    playerTags: string[];
    diceAmount: number;
    diceSides: number;
  }) {
    return new Embed()
      .setTitle('liars dice/swindlestones')
      .setDescription('react with 🎲 to join')
      .addField('game code', `\`${opts.gameCode}\``, true)
      .addField('time to join', `${opts.timeLeft} seconds`, true)
      .addField(
        'dice',
        `${opts.diceAmount} ${opts.diceSides}-sided ${opts.diceAmount === 1 ? 'die' : 'dice'}`,
        true
      )
      .addField('how 2 play?', 'go to https://en.wikipedia.org/wiki/Liar%27s_dice', false)
      .addField('players', opts.playerTags.join(', '))
      .setFooter('do ctrl + alt + ➡️ or ctrl + k to switch between dms and server channels');
  }

  async giveHand(guild: Guild, playerId: string, gameStore) {
    const player = await guild.members.fetch(playerId)
    const dmChannel = await player.createDM();

    dmChannel.send('poop');
  }
}
