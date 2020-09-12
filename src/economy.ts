import moment from 'moment';

import { Store } from './store';
import { Economy } from './types';
import { resolvePath } from './util';

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
  static addToEconomy(memberId: string): void {
    const economy = getEconomy();

    economy.members[memberId] = {
      coins: 10,
      nextAllowedBankrupt: undefined,
    };

    setEconomy(economy);
  }

  static isInEconomy(memberId: string): boolean {
    const economy = getEconomy();

    return economy.members[memberId] !== undefined;
  }

  static getCoins(memberId: string): number {
    const member = getEconomy().members[memberId];
    if (!member) throw new Error('not in economy');
    return member.coins;
  }

  static setCoins(memberId: string, coins: number): number {
    const economy = getEconomy();
    const member = economy.members[memberId];
    if (!member) throw new Error('not in economy');
    member.coins = coins;
    setEconomy(economy);
    return coins;
  }

  static addCoins(memberId: string, coins: number): number {
    return this.setCoins(memberId, this.getCoins(memberId) + coins);
  }

  static subtractCoins(memberId: string, coins: number): number {
    return this.setCoins(memberId, Math.max(this.getCoins(memberId) - coins, 0));
  }

  static bankrupt(memberId: string): boolean {
    if (this.getCoins(memberId) !== 0) return false;
    const economy = getEconomy();
    const member = economy.members[memberId];
    if (!member) throw new Error('not in economy');
    if (member.nextAllowedBankrupt) {
      const nextAllowedBankrupt = moment(member.nextAllowedBankrupt, moment.ISO_8601);
      // if nextAllowed is in the future, return
      if (nextAllowedBankrupt.diff(moment(moment.now()), 'hours') > 0) return false;
    }

    this.setCoins(memberId, 2);
    member.nextAllowedBankrupt = moment(moment.now())
      .add(moment.duration(2, 'hours'))
      .toISOString();

    return true;
  }
}
