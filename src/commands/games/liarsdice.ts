import { Message, TextChannel, User } from 'discord.js';
import fse from 'fs-extra';
import yaml from 'js-yaml';
import _ from 'lodash';
import sharp from 'sharp';
import yargsParser from 'yargs-parser';

import { Command } from '..';
import { LiarsDice, LiarsDicePlayer } from '../../entities/LiarsDice';
import { Die } from '../../gamemanagers/common';
import { LiarsDiceManager } from '../../gamemanagers/liarsdicemanager';
import { client } from '../../providers';
import { CmdArgs, GameReactionCollector } from '../../types';
import { codeBlock, Embed, resolvePath } from '../../util';

type Bid = [quantity: number, value: number];

const reactionCollectors: GameReactionCollector[] = [];

export class CommandLiarsDice implements Command {
  cmd = 'dice';
  yargsSchema: yargsParser.Options = {
    boolean: ['start', 'cancel', 'how2play'],
    alias: {
      create: 'c',
      start: 's',
    },
  };
  docs = [
    {
      usage: 'dice -c, --create [-d diceAmount=5] [-n diceSides=6]',
      description: 'create dice game',
    },
    {
      usage: 'dice -s, --start',
      description: 'start dice game (game creator only)',
    },
    {
      usage: 'dice --cancel',
      description: 'cancel dice game (game creator only)',
    },
    {
      usage: 'dice --how2play',
      description: 'Hey Helper, how play game?',
    },
  ];

  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args, em } = cmdArgs;

    const manager = new LiarsDiceManager(em);

    if (args.cancel) {
      const game = await manager.get(msg.author?.id as string);

      if (!game) return msg.channel.send('not in game');
      if (game.creatorId !== msg.author?.id)
        return msg.channel.send(`only game creator can cancel`);

      reactionCollectors.find(c => c.gameCode === game.gameCode)?.stop('cancel');
      msg.channel.send('cancelled');
      return;
    }

    if (args.start) {
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
    if (!args.create) {
      // return msg.channel.send(`usage: \`${this.docs.map(d => d.usage).join('`, `')}\``);
      return msg.channel.send(Embed.warning(
        'incorrect usage',
        'usage: \n' + codeBlock(this.docs.map(d => d.usage).join('\n'))
      )
      );
    }

    const diceAmount = args.dice ?? 5;
    if (diceAmount > 10 || diceAmount < 1) return msg.channel.send('1-10 dice allowed');
    const diceSides = args.sides ?? 6;
    if (diceSides > 6 || diceSides < 4) return msg.channel.send('4-6 dice sides allowed');

    if (args.how2play) {
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

    // const game = new LiarsDice();
    // game.diceAmount = diceAmount;
    // game.diceSides = diceSides;
    // game.creatorId = msg.author?.id as string;
    // game.guildId = msg.guild?.id as string;
    // game.gameCode = gameCode;
    // game.playerOrder = [];

    const game = em.create(LiarsDice, {
      diceAmount,
      diceSides,
      gameCode,
      playerOrder: [],
      creatorId: msg.author?.id as string,
      guildId: msg.guild?.id as string,
    });

    em.persist(game);

    const creator = em.create(LiarsDicePlayer, {
      game,
      hand: Die.array(diceAmount, diceSides).map(d => d.value),
      playerId: msg.author?.id,
    });

    em.populate(creator, 'game');
    em.persist(creator);

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

    collector.gameCode = gameCode;
    reactionCollectors.push(collector);

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
      .on('end', async (__, reason) => {
        clearInterval(interval);
        updateEmbed(0);

        if (reason === 'cancel') {
          console.log('cancelling game');
          em.nativeDelete(LiarsDicePlayer, { game: game.id });
          return em.removeAndFlush(game);
        }

        if (game.players.length < 2) {
          em.nativeDelete(LiarsDicePlayer, { game: game.id });
          em.removeAndFlush(game);
          console.log('not enough players');
          return msg.channel.send('not enough players to start, aborting');
        }

        const players = await game.players.loadItems();
        const playerIds = players.map(p => p.playerId);

        await msg.channel.send(
          `${playerIds.map(id => `<@${id}>`).join(' ')} game ${gameCode} starting!`
        );

        setTimeout(async () => {
          console.log('initializing game');

          game.roundNumber = 1;

          console.log('deciding player order');
          game.playerOrder = _.shuffle(playerIds);

          console.log('flushing db');
          em.flush();

          console.log('starting first round');
          this.startRound(game, msg.channel as TextChannel, cmdArgs);
        }, 0);

        return;
      });
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
        `${opts.diceAmount} ${opts.diceAmount === 1 ? 'die' : 'dice'} with ${opts.diceSides} sides `,
        true
      )
      .addField('how 2 play?', 'type <prefix>dice --how2play', false)
      .addField('players', opts.playerTags.join(', '))
      .setFooter('do ctrl + alt + ➡️ or ctrl + k to switch between dms and server channels');
  }

  makeDiceImage(diceValues: number[]): Promise<Buffer> {
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

    return image.png().toBuffer();
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
      const { em } = cmdArgs;
      em.findOneOrFail(LiarsDicePlayer, { playerId }).then(player => {
        this.makeDiceImage(player.hand).then(bufer => {
          const embed = new Embed()
            .setTitle(`Round ${game.roundNumber}: Your hand (${game.gameCode}) `)
            .setImage('attachment://dice.png')
            .attachFiles([{ attachment: bufer, name: 'dice.png' }]);

          (client.users.resolve(playerId) as User).createDM().then(async dm =>
            dm.send(embed).then(() => {
              console.log('sent dm');
              resolve();
            })
          );
        });
      });
    });
  }

  makeBidEmbed({
    game,
    timeRemaining,
    highestBid,
  }: {
    game: LiarsDice;
    timeRemaining: number;
    highestBid: Bid;
  }): Embed {
    const embed = new Embed()
      .setTitle('Place your bids or call')
      .setDescription('Say number of dice and faces (ex. "1 4" is 1 dice with side of 4) or "call"')
      .addField('Turn', `<@!${game.currentBidder}>`, true)
      .addField('Round #', game.roundNumber)
      .addField('Code', game.gameCode, true)
      .addField('Current highest bid', `${highestBid[0]} dice with value ${highestBid[1]}`)
      .addField('Time remaining', timeRemaining + ' seconds');
    return embed;
  }

  getBid({
    channel,
    game,
    cmdArgs,
    highestBid,
  }: {
    channel: TextChannel;
    game: LiarsDice;
    cmdArgs: CmdArgs;
    highestBid: Bid;
  }): Promise<'call' | Bid> {
    return new Promise<'call' | Bid>((resolve, reject) => {
      let biddingTime = 60;

      channel
        .send(`<@!${game.currentBidder}>`, {
          embed: this.makeBidEmbed({ game, timeRemaining: biddingTime, highestBid }),
        })
        .then(embedMessage => {
          const updateEmbed = (newTime: number) => {
            const embed = this.makeBidEmbed({ game, timeRemaining: newTime, highestBid });
            embedMessage.edit(`<@!${game.currentBidder}>`, { embed: embed });
          };

          const interval = setInterval(() => updateEmbed((biddingTime -= 5)), 5000);

          let input: string;
          const collector = channel.createMessageCollector(
            (msg: Message) => msg.author.id === game.currentBidder,
            { time: 60000 }
          );
          collector.on('collect', (msg: Message) => {
            if (!/^(\d \d|.*call.*)$/i.test(msg.content))
              return msg.channel.send('stinky syntax, try again');

            input = msg.content;

            // check if bid is too low
            const bidAmount = input.split(' ').map(v => parseInt(v)) as Bid;
            if (bidAmount[0] > game.diceAmount || bidAmount[1] > game.diceSides)
              return channel.send('bid too high');

            if ( // if lower quantity and same face value, or if same quantity and lower face value
              bidAmount[0] < highestBid[0] ||
              bidAmount[0] == highestBid[0] &&
              bidAmount[1] < highestBid[1] ||
              bidAmount[0] == 0 ||
              bidAmount[1] == 0
            ) {
              input = "";
              return channel.send('bid too low (either higher quantity or greater face value), try again');
            }

            collector.stop();

          });
          collector.on('end', () => {
            clearInterval(interval);
            updateEmbed(0);

            if (/\d \d/.test(input)) {
              // x dice with n dots
              const [quantity, value] = input.split(' ').map(v => parseInt(v));
              channel.send(`You bid ${quantity} dice with value of ${value}`);
              resolve([quantity, value] as Bid);
            } else if (/.*call.*/.test(input)) {
              // call
              channel.send('You call!');
              resolve('call');
            } else {
              reject('timeout');
            }
          });
        });
    });
  }

  async startRound(game: LiarsDice, channel: TextChannel, cmdArgs: CmdArgs): Promise<void> {
    const { em } = cmdArgs;
    console.log(`starting round ${game.roundNumber}`);
    console.log(`player order: ${game.playerOrder.join(', ')}`);

    (await game.players.loadItems()).forEach(async p => {
      await this.giveHand({ playerId: p.playerId, game, cmdArgs });
    });

    let highestBid: Bid = [0, 0];

    console.log('starting bids');
    for (let playerIndex = 0; playerIndex < game.playerOrder.length; playerIndex++) {
      const playerId = game.playerOrder[playerIndex];

      game.currentBidder = playerId;
      console.log(`asking ${playerId} for their bid`);

      try {
        const output = await this.getBid({ channel, game, cmdArgs, highestBid });
        if (Array.isArray(output)) {
          highestBid = output;

          // loop
          if (playerIndex === game.playerOrder.length - 1) playerIndex = -1;
          continue;
        }

        channel.send(
          `<@${game.currentBidder}> called <@${game.playerOrder[playerIndex - 1]}> (${(highestBid[0], highestBid[1])
          })`
        );

        // (await em.find(LiarsDicePlayer, { game })).map();

        break;
      } catch (err) {
        if (err === 'timeout') {
          const foo: Bid = [highestBid[0] == 0 ? 1 : highestBid[0], 0];

          const newBid: Bid =
            foo[1] < game.diceSides
              ? [foo[0], foo[1] + 1]
              : [foo[0] + 1, 1];

          channel.send(`no bid was made in time, your bid is now ${newBid[0]} ${newBid[1]}`);
          highestBid = newBid;

          if (playerIndex === game.playerOrder.length - 1) playerIndex = -1;
        } else channel.send('caught error: ' + err);
      }
    }
  }
}
