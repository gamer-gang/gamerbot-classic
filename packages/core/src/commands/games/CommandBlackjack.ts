import { Colors, delay, Embed, getProfileImageUrl } from '@gamerbot/util';
import { stripIndent } from 'common-tags';
import { Message, MessageActionRow, MessageButton, Snowflake } from 'discord.js';
import _ from 'lodash';
import { ChatCommand, CommandDocs, CommandOptions } from '..';
import { EggLeaderboard } from '../../entities/EggLeaderboard';
import { APIMessage, CommandEvent } from '../../models/CommandEvent';

type CardSuit = 'diamonds' | 'clubs' | 'hearts' | 'spades';
const suitIcons: { [suit in CardSuit]: string } = {
  diamonds: '\\♦',
  clubs: '\\♣',
  hearts: '\\♥',
  spades: '\\♠',
};

class Card {
  constructor(public value: string, public suit: CardSuit, public weight: number) {}
  get text() {
    return `${this.value}\u2009${suitIcons[this.suit]}`;
  }

  [Symbol.toPrimitive](hint: string) {
    if (hint == 'number') return this.weight;
    if (hint == 'string') return this.text;
    return this.text;
  }
}

class Hand {
  #cards: Card[] = [];

  draw(deck: Card[]) {
    const card = deck.pop();
    if (!card) throw new Error('Deck empty');
    this.#cards.push(card);
  }

  get total() {
    let nonAcesScore = 0;
    let acesInHand = 0;
    let acesScore = 0;

    for (const card of this) {
      if (card.value === 'A') acesInHand += 1;
      else nonAcesScore += card.weight;
    }

    let highAces = 0;
    let lowAces = acesInHand;
    for (let i = acesInHand; i > 0; i--) {
      if (i * 11 + (acesInHand - i) * 1 + nonAcesScore <= 21) {
        highAces = i;
        lowAces = acesInHand - 1;
        break;
      }
    }
    acesScore = highAces * 11 + lowAces * 1;

    // return {
    //   score: acesScore + nonAcesScore,
    //   soft: acesInHand > 0
    // }
    return acesScore + nonAcesScore;
  }

  get softTotal() {
    return this.#cards.some(c => c.value === 'A');
  }

  get last() {
    return this.#cards[this.#cards.length - 1];
  }

  get text() {
    return this.#cards.map(c => c.text).join(' \u2009');
  }

  *[Symbol.iterator]() {
    for (const card of this.#cards) yield card;
  }

  get(index: number) {
    return this.#cards[index];
  }
}

class CommandBlackjack extends ChatCommand {
  name = ['blackjack', 'bj'];
  help: CommandDocs = [
    {
      usage: 'blackjack [bet]',
      description: 'play blackjack (leave out bet to play without bet)',
    },
  ];
  data: CommandOptions = {
    description: 'Play blackjack',
    options: [
      {
        name: 'bet',
        description: 'Number of eggs to bet (leave blank to play without bet)',
        type: 'INTEGER',
      },
    ],
  };

  playing = new Set<Snowflake>();

  async execute(event: CommandEvent): Promise<void | Message | APIMessage> {
    const bet = event.isInteraction() ? event.options.getInteger('bet') : parseInt(event.args, 10);

    if (bet != null) {
      const notEnoughEggs = Embed.error('Not enough eggs', 'Get egging!');

      const entry = await event.em.findOne(EggLeaderboard, { userId: event.user.id });
      if (!entry) return event.reply(notEnoughEggs);

      if (bet < 5) return event.reply(Embed.error('The minimum bet is 5🥚.'));

      if (entry.balance < BigInt(bet))
        return event.reply(
          Embed.error('Not enough eggs owned', `Your balance: ${entry.balance.toLocaleString()}`)
        );

      await this.playGame(event, bet, entry);
      event.em.flush();
    } else this.playGame(event);
  }

  #createDeck(): Card[] {
    const suits: CardSuit[] = ['diamonds', 'clubs', 'hearts', 'spades'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck: Card[] = [];

    for (const value of values) {
      for (const suit of suits) {
        let weight = parseInt(value);
        if (value === 'J' || value === 'Q' || value === 'K') weight = 10;
        else if (value == 'A') weight = 11;

        deck.push(new Card(value, suit, weight));
      }
    }

    return deck;
  }

  async playGame(event: CommandEvent, bet?: number, entry?: EggLeaderboard): Promise<boolean> {
    const deck = _.shuffle(this.#createDeck());

    const playerHand = new Hand();
    const dealerHand = new Hand();

    playerHand.draw(deck);
    dealerHand.draw(deck);
    playerHand.draw(deck);
    dealerHand.draw(deck);

    const makeButtons = (disabled = false) => {
      return new MessageActionRow({
        components: [
          new MessageButton({ disabled, customId: 'hit', style: 'SUCCESS', label: 'Hit' }),
          new MessageButton({ disabled, customId: 'stand', style: 'PRIMARY', label: 'Stand' }),
        ],
      });
    };

    const makeEmbed = (firstTurn = false) => {
      return new Embed({
        author: { iconURL: getProfileImageUrl(event.user), name: event.user.tag },
        title: 'Blackjack',
        description: stripIndent`
          ${bet ? `Bet: **${bet}🥚**\n` : ''}
          **Dealer's Hand (${firstTurn ? dealerHand.get(0).weight : dealerHand.total})**
          ${firstTurn ? dealerHand.get(0).text + ' ?' : dealerHand.text}

          **Your hand (${playerHand.total})**
          ${playerHand.text}`,
        footer: { text: 'Select an option below.' },
      });
    };

    event.reply({ embeds: [makeEmbed()], components: [makeButtons()] });

    const reply = event.channel.messages.cache.get((await event.fetchReply()).id)!;

    const collector = reply.createMessageComponentCollector({
      idle: 1000 * 60,
      filter: interaction => interaction.user.id === event.user.id,
    });

    return new Promise(resolve => {
      collector.on('collect', async interaction => {
        if (interaction.customId === 'hit') {
          playerHand.draw(deck);
          if (playerHand.total > 21) {
            if (bet && entry) entry.balance = BigInt(entry.balance) - BigInt(bet);
            interaction.update({
              embeds: [
                makeEmbed(true)
                  .setFooter(
                    `Busted! ${
                      bet
                        ? `You lost ${bet}🥚, leaving you with a balance of ${entry!.balance}🥚.`
                        : ''
                    }`
                  )
                  .setColor(Colors.red.number),
              ],
              components: [],
            });
            collector.stop();
            resolve(false);
          } else {
            interaction.update({
              embeds: [
                makeEmbed(true).setFooter(
                  `You were dealt ${playerHand.last
                    .toString()
                    .replace(/\\/g, '')}. Select an option below.`
                ),
              ],
              components: [makeButtons()],
            });
          }
        } else {
          collector.stop();

          if (dealerHand.total < 17) {
            interaction.update({
              embeds: [makeEmbed().setFooter('Dealer is drawing.')],
              components: [makeButtons(true)],
            });

            while (true) {
              await delay(1000)(0);
              dealerHand.draw(deck);
              if (dealerHand.total >= 17) break;
              await reply.edit({
                embeds: [
                  makeEmbed().setFooter(
                    `Dealer drew ${dealerHand.last.toString().replace(/\\/g, '')}.`
                  ),
                ],
                components: [makeButtons(true)],
              });
            }
          }

          if (dealerHand.total > 21) {
            if (bet && entry) entry.balance = BigInt(entry.balance) + BigInt(bet);
            reply.edit({
              embeds: [
                makeEmbed()
                  .setFooter(
                    `Dealer busted! ${
                      bet
                        ? `You won ${bet}🥚, bringing your balance to ${entry!.balance}🥚.`
                        : 'Player wins!'
                    }`
                  )
                  .setColor(Colors.green.number),
              ],
              components: [],
            });
            resolve(true);
          } else if (dealerHand > playerHand) {
            if (bet && entry) entry.balance = BigInt(entry.balance) - BigInt(bet);
            reply.edit({
              embeds: [
                makeEmbed()
                  .setFooter(
                    `Dealer wins! ${
                      bet
                        ? `You lost ${bet}🥚, leaving you with a balance of ${entry!.balance}🥚.`
                        : ''
                    }`
                  )
                  .setColor(Colors.red.number),
              ],
              components: [],
            });
            resolve(false);
          } else {
            if (bet && entry) entry.balance = BigInt(entry.balance) + BigInt(bet);
            reply.edit({
              embeds: [
                makeEmbed()
                  .setFooter(
                    `Player wins! ${
                      bet ? `You won ${bet}🥚, bringing your balance to ${entry!.balance}🥚.` : ''
                    }`
                  )
                  .setColor(Colors.red.number),
              ],
              components: [],
            });
            resolve(true);
          }
        }
      });
    });
  }
}
