import * as randomstring from 'randomstring';
import { LiarsDice, LiarsDicePlayer } from '../entities/LiarsDice';

export class LiarsDiceManager {
  // TODO fix
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  constructor(private em: any) {}

  async games(): Promise<LiarsDice[]> {
    return await this.em.find(LiarsDice, {});
  }

  async gameCodes(): Promise<string[]> {
    return (await this.games()).map(game => game.gameCode);
  }

  async makeGameCode(): Promise<string> {
    let code: string;
    const existing = await this.gameCodes();

    do {
      code = 'ld-' + randomstring.generate({ length: 4, charset: '1234567890' });
    } while (existing.includes(code));

    return code;
  }

  /** @param search either a playerId or a game code */
  async get(search: string): Promise<LiarsDice | null> {
    const player = await this.em.findOne(LiarsDicePlayer, { playerId: search });
    if (player) return player.game;
    else {
      const game = await this.em.findOne(LiarsDice, { gameCode: search });
      return game ?? null;
    }
  }
}
