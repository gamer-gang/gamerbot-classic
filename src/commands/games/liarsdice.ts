import { Message, TextChannel, User } from 'discord.js';
import fse from 'fs-extra';
import yaml from 'js-yaml';
import sharp from 'sharp';
import { inspect } from 'util';

import { Command, unknownFlags } from '..';
import { Embed } from '../../embed';
import { LiarsDice, LiarsDicePlayer } from '../../entities/LiarsDice';
import { Die } from '../../gamemanagers/common';
import { LiarsDiceManager } from '../../gamemanagers/liarsdicemanager';
import { CmdArgs, GameReactionCollector } from '../../types';
import { hasFlags, resolvePath, shuffleArray, spliceFlag } from '../../util';

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
    {
      usage: 'liarsdice --how2play',
      description: 'Hey Helper, how play game?',
    },
  ];

  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, flags, args, client, em } = cmdArgs;

    const manager = new LiarsDiceManager(em);

    if (unknownFlags(cmdArgs, 'c|-create|s|-start|n|d|-cancel')) return;

    if (hasFlags(flags, ['--cancel'])) {
      const game = await manager.get(msg.author?.id as string);

      if (!game) return msg.channel.send('not in game');
      if (game.creatorId !== msg.author?.id)
        return msg.channel.send(`only game creator can cancel`);

      reactionCollectors.find(c => c.gameCode === game.gameCode)?.stop('cancel');
      msg.channel.send('cancelled');
      return;
    }

    if (hasFlags(flags, ['-s', '--start'])) {
      const game = await manager.get(msg.author?.id as string);

      if (!game) return msg.channel.send('not in game');
      if (game.creatorId !== msg.author?.id) {
        console.log('person is smelly');
        return msg.channel.send(`ask <@!${game.creatorId}> to start the game`);
      }

      if (Object.keys(game.players).length < 2) return msg.channel.send('need more players');

      return reactionCollectors.find(c => c.gameCode === game.gameCode)?.stop('start');
    }

    // create game
    if (!hasFlags(flags, ['-c', '--create'])) {
      return msg.channel.send(`usage: \`${this.docs.map(d => d.usage).join('`, `')}\``);
    }

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
      if (parsed > 6 || parsed < 4) return msg.channel.send('4-6 dice sides allowed');

      diceSides = parsed;
    }

    if (hasFlags(flags, ['--how2play'])) {
      // read the ymal file
      const file = (await fse.readFile(resolvePath('assets/dice-man.yaml'))).toString('utf-8');
      const { how2play } = yaml.load(file);

      const embed = new Embed().setTitle(how2play.title).setDescription(how2play.description);

      how2play.fields.map(({ name, value }) => embed.addField(name, value));

      return msg.channel.send(embed);
    }

    // only include if not in game already
    if (await manager.get(msg.author?.id as string))
      return msg.channel.send('u are smelly and in a game already');

    // generate new game
    const gameCode = await manager.makeGameCode();

    // make embed
    let timeLeft = 120;
    const playerTags: string[] = [msg.author?.tag as string];

    const embedMessage = await msg.channel.send(
      this.makeJoinEmbed({
        gameCode,
        timeLeft,
        playerTags,
        diceAmount,
        diceSides,
      })
    );

    embedMessage.react('🎲');

    const game = new LiarsDice();

    game.diceAmount = diceAmount;
    game.diceSides = diceSides;
    game.creatorId = msg.author?.id as string;
    game.guildId = msg.guild?.id as string;
    game.gameCode = gameCode;
    game.playerOrder = [];

    em.persist(game);

    const updateEmbed = (time = timeLeft) =>
      embedMessage.edit(
        this.makeJoinEmbed({
          gameCode: gameCode,
          timeLeft: time,
          playerTags,
          diceAmount,
          diceSides,
        })
      );

    // set 2 min timer
    const interval = setInterval(() => updateEmbed((timeLeft -= 5)), 5000);

    // create reaction collector
    const collector = embedMessage.createReactionCollector(
      ({ emoji }, user) =>
        emoji.name === '🎲' &&
        ![msg.author?.id as string, client.user?.id as string].includes(user.id),
      { time: 120000, dispose: true }
    ) as GameReactionCollector;

    collector
      .on('collect', async (_, user: User) => {
        if (!game) return msg.channel.send('error in collect: game is nul');
        const player = em.create(LiarsDicePlayer, {
          game,
          hand: Die.array(diceAmount, diceSides).map(d => d.value),
          playerId: user.id,
        });

        em.populate(player, 'game');
        em.persistAndFlush(player);

        playerTags.push(user.tag);
        updateEmbed();
      })
      .on('remove', async (_, user: User) => {
        em.nativeDelete(LiarsDicePlayer, { playerId: user.id });
        playerTags.splice(playerTags.indexOf(user.tag), 1);
        updateEmbed();
      })
      .on('end', async (_, reason) => {
        clearInterval(interval);
        updateEmbed(0);

        if (reason === 'cancel') return em.remove(game);

        if (game.players.length < 2) {
          em.remove(game);
          return msg.channel.send('not enough players to start, aborting');
        }

        msg.channel.send(`${playerTags.map(t => `@${t}`).join(' ')} game ${gameCode} starting!`);

        setTimeout(async () => {
          const players = await game.players.loadItems();
          const playerIds = players.map(p => p.playerId);
          console.log(playerIds);

          game.playerOrder = shuffleArray(playerIds);
          game.roundNumber = 1;
          console.log(inspect(game, true, null, true));

          em.flush();

          this.startRound(game, msg.channel as TextChannel, cmdArgs);
        }, 0);

        return;
      });

    collector.gameCode = gameCode;

    if (!game) return msg.channel.send('error in executor: game is nul');

    const creator = em.create(LiarsDicePlayer, {
      game,
      hand: Die.array(diceAmount, diceSides).map(d => d.value),
      playerId: msg.author?.id,
    });

    em.populate(creator, 'game');
    em.persist(creator);

    reactionCollectors.push(collector);
  }

  makeJoinEmbed(opts: {
    gameCode: string;
    timeLeft: number;
    playerTags: string[];
    diceAmount: number;
    diceSides: number;
  }): Embed {
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
      .addField('how 2 play?', 'type <prefix>dice --how2play', false)
      .addField('players', opts.playerTags.join(', '))
      .setFooter('do ctrl + alt + ➡️ or ctrl + k to switch between dms and server channels');
  }

  makeDiceImage(diceValues: number[]): Promise<Buffer> {
    return new Promise<Buffer>(resolve => {
      const image = sharp({
        create: {
          width: 64 * 5 + 8 * 4,
          height: 64,
          background: '#00000000',
          channels: 4,
        },
      });

      diceValues.sort((a, b) => a - b);

      image.composite(
        diceValues.map((n, i) => ({
          input: resolvePath(`assets/dice-${n}.smol.png`),
          top: 0,
          left: i * 64 + i * 8,
        }))
      );

      const path = resolvePath('data/temp.png');

      image.png().toBuffer().then(resolve);
    });
  }

  async giveHand({
    playerId,
    cmdArgs,
    game,
  }: {
    playerId: string;
    cmdArgs: CmdArgs;
    game: LiarsDice;
  }): Promise<void> {
    return new Promise<void>(resolve => {
      const { em, client } = cmdArgs;
      em.findOneOrFail(LiarsDicePlayer, { playerId }).then(player => {
        this.makeDiceImage(player.hand).then(bufer => {
          const embed = new Embed()
            .setTitle(`Round ${game.roundNumber}: Your hand (${game.gameCode}) `)
            .setImage('attachment://dice.png')
            .attachFiles([{ attachment: bufer, name: 'dice.png' }]);

          (client.users.resolve(playerId) as User).createDM().then(async dm => {
            await dm.send(embed);
            console.log('sent dm');
            resolve();
          });
        });
      });
    });
  }

  bidDice(channel: TextChannel, game: LiarsDice, cmdArgs: CmdArgs): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const { em, client } = cmdArgs;

      const embed = new Embed()
        .setTitle('Place your bids or call')
        .setDescription(
          'Say number of dice and faces (ex. "1 4" is 1 dice with side of 4) or "call"'
        )
        .addField('Turn', `<@!${game.currentBidder}>`)
        .addField('Code', game.gameCode);

      channel.send(embed);

      let input: string;
      const collector = channel.createMessageCollector(
        (msg: Message) => msg.author.id !== client.user?.id,
        { time: 60000 }
      );
      collector.on('collect', (msg: Message) => {
        if (!/^(\d \d|.*call.*)$/i.test(msg.content)) msg.channel.send('stinky syntax, try again');
        else {
          input = msg.content;
          collector.stop();
        }
      });
      collector.on('end', collection => {
        if (/\d \d/.test(input)) {
          // _ dice with _ dots
          const [quantity, value] = input.split(' ').map(v => parseInt(v));
          channel.send(`You bid ${quantity} dice with value of ${value}`);
          resolve(input);
        } else if (/.*call.*/.test(input)) {
          // call
          channel.send('You call!');
          resolve('call');
        } else {
          reject();
        }
      });
    });
  }

  async startRound(game: LiarsDice, channel: TextChannel, cmdArgs: CmdArgs): Promise<void> {
    (await game.players.loadItems()).forEach(
      async p => await this.giveHand({ playerId: p.playerId, game, cmdArgs })
    );

    type Bid = [quantity: number, value: number];
    let highestBid: Bid = [0, 0];
    console.log(game.playerOrder);

    for (const playerId of game.playerOrder) {
      game.currentBidder = playerId;
      console.log(playerId);

      let result: string;
      while (true) {
        result = await this.bidDice(channel, game, cmdArgs);

        if (result === 'call') {
          break;
        } else {
          const bidAmount = result.split(' ').map(v => parseInt(v)) as Bid;
          if (
            bidAmount[0] > highestBid[0] ||
            bidAmount.reduce((a, c) => a * c) > highestBid.reduce((a, c) => a * c)
          ) {
            highestBid = bidAmount;
            break;
          } else {
            // invalid bid, too low
            channel.send('bid too low (either higher quantity or greater face value)');
            continue;
          }
        }
      }

      if (result === 'call') {
        // do something
        channel.send('person has called btw');
        break;
      }
    }
    return;
  }
}
