export interface Economy {
  members: Record<string, MemberEconomy>;
}

export interface MemberEconomy {
  coins: number;
  /** Pass to luxon to get usable date */
  nextAllowedBankrupt?: string;
}
