import { Client } from 'discord.js';

export interface CachedInvite {
  guildId: Snowflake;
  code: string;
  creatorId: Snowflake;
  creatorTag: string;
  uses: number;
}

export interface CachedUsername {
  username: string;
  discriminator: string;
}

export class Gamerbot extends Client {
  readonly commands: Command[];
  readonly presenceManager: PresenceManager;
  readonly user: ClientUser;
  readonly youtube: youtube_v3.Youtube;
  readonly spotify: Spotify;
  readonly devMode: boolean;
  crypto: CryptoManager;
  /** only safe to access after 'ready' event */
  mediaServer: Guild;
  spotifyErrors: number;
  spotifyTimeouts: number[];
  spotifyDisabled: boolean;
  readonly queues: Store<Queue>;

  inviteCache: Map<string, CachedInvite>;
  usernameCache: Map<string, CachedUsername>;

  constructor(opts: GamerbotOptions);

  getCustomEmoji(name: string): GuildEmoji | undefined;

  get spotifyTimeoutSeconds(): number;
}
