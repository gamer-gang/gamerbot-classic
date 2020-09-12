import { CategoryChannel, TextChannel } from 'discord.js';
import { shuffle } from 'lodash/fp';
import * as randomstring from 'randomstring';

import { client } from '..';
import { Embed } from '../embed';
import { GuildGames, LiarsDiceGame, MikroOrmEm } from '../types';

export class LiarsDiceManager {
  games: GuildGames;
  liarsDice: Record<string, LiarsDiceGame>;

  constructor(private em: MikroOrmEm, public guildId: string) {
    this.games = { liarsDice: {} }; // TODO implement
    this.liarsDice = this.games.liarsDice;
  }

  makeGameCode(): string {
    let code: string;

    do {
      code =
        'ld-' +
        randomstring.generate({
          length: 4,
          charset: '1234567890',
        });
    } while (Object.keys(this.liarsDice).includes(code));

    return code;
  }

  inGame(playerId: string): string | null {
    for (const code of Object.keys(this.liarsDice)) {
      if (Object.keys(this.liarsDice[code].players).some(id => playerId === id)) return code;
    }
    return null;
  }

  isInGame(playerId: string): boolean {
    for (const code of Object.keys(this.liarsDice)) {
      if (Object.keys(this.liarsDice[code].players).some(id => playerId === id)) return true;
    }
    return false;
  }

  setGame(code: string, game: LiarsDiceGame): void {
    this.liarsDice[code] = game;
    this.write();
  }

  get(code: string): LiarsDiceGame {
    return this.liarsDice[code];
  }

  delete(code: string): void {
    delete this.liarsDice[code];
    this.write();
  }

  write(): void {
    // gameStore.set(this.guildId, this.games);
    // gameStore.writeFile();
    // TODO save game
  }

  gameCodes(): string[] {
    return Array.from(Object.keys(this.liarsDice));
  }

  async startGame(code: string, channel: TextChannel): Promise<void> {
    const guild = await client.guilds.fetch(this.guildId);
    const game = this.liarsDice[code];
    const playerOrder = shuffle(Object.keys(game.players)).map(
      id => guild.members.resolve(id)?.user.tag
    );

    const gameChannel = await guild.channels.create(this.channelName(code), {
      parent: channel.parentID
        ? (guild.channels.resolve(channel.parentID) as CategoryChannel)
        : undefined,
      type: 'text',
    });

    channel.send(
      new Embed()
        .setTitle(`liars dice (\`${code}\`)`)
        .setDescription(`game started in <#${gameChannel.id}>!`)
    );

    gameChannel.send(
      new Embed()
        .setTitle(`liars dice (\`${code}\`): info`)
        .addField('dice', `${game.metadata.diceAmount} ${game.metadata.diceSides}-sided dice`, true)
        .addField('player order', `\`\`\`${playerOrder.join(' => ')}\`\`\``)
    );
  }

  channelName(code: string): string {
    return 'liarsdice-' + code.replace('ld-', '');
  }
}
