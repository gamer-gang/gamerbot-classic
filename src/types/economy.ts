export interface Economy {
  members: Record<string, MemberEconomy>;
}

export interface MemberEconomy {
  coins: number;
  /** Pass to `moment` to get usable date */
  nextAllowedBankrupt?: string;
}
