import { Store } from './store';
import { Economy } from './types';
import { resolvePath } from './util';
import * as _ from 'lodash/fp';

export const BANKRUPT_COOLDOWN = 720;

const economyStore = new Store<Economy>({
  path: resolvePath('data/economy.yaml'),
  dataLanguage: 'yaml',
  readImmediately: true,
  writeOnSet: true,
});

const getEconomy = () => economyStore.get('economy');
const setEconomy = (economy: Economy) => economyStore.set('economy', economy);

export class EconomyManager {
  static addToEconomy(playerId: string): void {
    const economy = getEconomy();

    economy.members[playerId] = {
      coins: 10,
      nextAllowedBankrupt: undefined,
    };

    setEconomy(economy);
  }

  static isInEconomy(playerId: string): boolean {
    const economy = getEconomy();

    return economy.members[playerId] !== undefined;
  }

  static getCoins(playerId: string): number {
    const member = getEconomy().members[playerId];
    if (!member) throw new Error('not in economy');
    return member.coins;
  }

  static setCoins(playerId: string, coins: number): number {
    const economy = getEconomy();
    economy.members[playerId].coins = coins;
    setEconomy(economy);

    return coins;
  }

  static addCoins(playerId: string, coins: number): number {
    return this.setCoins(playerId, this.getCoins(playerId) + coins);
  }

  static subtractCoins(playerId: string, coins: number): number {
    return this.setCoins(playerId, Math.max(this.getCoins(playerId) - coins, 0));
  }

  static bankrupt(playerId: string): boolean {
    if (this.getCoins(playerId) !== 0) return false;

    return false;
  }
}
