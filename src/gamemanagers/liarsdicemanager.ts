import { LiarsDiceGame, GuildGames } from "../types";
import * as randomstring from 'randomstring';
import { gameStore } from '..';

export class LiarsDiceManager {
  games: GuildGames;
  liarsDice: Record<string, LiarsDiceGame>;

  constructor(public guildId: string) {
    this.games = gameStore.get(guildId);
    this.liarsDice = this.games.liarsDice;
  }

  makeGameCode() {
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

  inGame(playerId: string) {
    for (const code of Object.keys(this.liarsDice)) {
      if (Object.keys(this.liarsDice[code].players).some(id => playerId === id)) return code;
    }
    return null;
  }

  isInGame(playerId: string) {
    for (const code of Object.keys(this.liarsDice)) {
      if (Object.keys(this.liarsDice[code].players).some(id => playerId === id)) return true;
    }
    return false;
  }

  setGame(code: string, game: LiarsDiceGame) {
    this.liarsDice[code] = game;
    this.write();
  }

  get(code: string) {
    return this.liarsDice[code];
  }

  write() {
    gameStore.set(this.guildId, this.games);
  }
}