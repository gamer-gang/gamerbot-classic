import { Client, ClientOptions, ClientUser, Guild, GuildEmoji } from 'discord.js';
import fse from 'fs-extra';
import { google } from 'googleapis';
import Spotify from 'spotify-web-api-node';
import { Command } from './commands';
import { CryptoManager } from './commands/crypto/CryptoManager';
import { logger } from './providers';
import { Queue } from './types';
import { PresenceManager, resolvePath, Store } from './util';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GamerbotOptions extends Omit<ClientOptions, 'partials'> {}

export type KnownEmojis =
  | 'success'
  | 'error'
  | 'warn'
  | 'worksonmymachine'
  | 'up_arrow'
  | 'down_arrow';

export class Gamerbot extends Client {
  readonly commands: Command[] = [];
  readonly presenceManager: PresenceManager;
  readonly user!: ClientUser;
  readonly youtube = google.youtube({
    version: 'v3',
    auth: process.env.YT_API_KEY,
  });
  readonly spotify = new Spotify({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  });

  readonly devMode = process.env.NODE_ENV === 'development';
  crypto!: CryptoManager;

  /** only safe to access after 'ready' event */
  mediaServer!: Guild;

  private spotifyErrors = -1;
  spotifyTimeouts = [5, 10, 30, 60, 60 * 2, 60 * 5, 60 * 10];
  spotifyDisabled = false;

  readonly queues = new Store<Queue>();

  constructor(opts: GamerbotOptions = {}) {
    super({
      ...(opts as Pick<GamerbotOptions, keyof Omit<ClientOptions, 'partials'>>),
      partials: ['MESSAGE', 'REACTION'],
    });

    this.presenceManager = new PresenceManager(this);

    this.initCommands();
    this.initSpotify();

    if (!process.env.HYPIXEL_API_KEY) {
      logger.warn('missing hypixel api key! disabling stats support');
    }

    this.on('ready', () => {
      if (!process.env.MEDIA_SERVER_ID) {
        logger.warn('no media server set! disabling custom emojis');
        return;
      }

      this.mediaServer = this.guilds.cache.get(process.env.MEDIA_SERVER_ID)!;

      const expectedEmojis = ['success', 'error', 'warn', 'up_arrow', 'down_arrow'];
      expectedEmojis.forEach(name => {
        if (!this.getCustomEmoji(name))
          logger.warn(`media server missing '${name}' emoji! using fallback`);
      });

      if (!this.getCustomEmoji('worksonmymachine')) {
        logger.warn(`media server missing 'worksonmymachine' emoji! disabling $techsupport`);
        this.commands.splice(this.commands.findIndex(c => c.cmd.includes('techsupport')));
      }

      this.crypto = new CryptoManager();
    });
  }

  getCustomEmoji<T extends KnownEmojis>(name: T): GuildEmoji | undefined;
  getCustomEmoji<T extends string | symbol>(name: Exclude<T, KnownEmojis>): GuildEmoji | undefined;
  getCustomEmoji(name: string): GuildEmoji | undefined {
    return this.mediaServer?.emojis.cache.find(e => e.name === name);
  }

  get spotifyTimeoutSeconds(): number {
    return this.spotifyTimeouts[Math.min(this.spotifyErrors, this.spotifyTimeouts.length - 1)];
  }

  private async initSpotify() {
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      this.spotifyDisabled = true;
      logger.warn('missing spotify credentials! disabling spotify support');
      return;
    }

    try {
      const grant = await this.spotify.clientCredentialsGrant();
      logger.debug(`new spotify access token granted, expires in ${grant.body.expires_in} seconds`);
      this.spotify.setAccessToken(grant.body.access_token);
      this.spotifyErrors = -1;
      setTimeout(this.initSpotify.bind(this), grant.body.expires_in * 1000);
    } catch (err) {
      this.spotifyErrors++;

      logger.error(err);
      logger.warn(
        `spotify error #${this.spotifyErrors + 1}; trying again in ${
          this.spotifyTimeoutSeconds
        } seconds`
      );
      setTimeout(this.initSpotify.bind(this), this.spotifyTimeoutSeconds * 1000);
    }
  }

  private async initCommands() {
    let modules: any[];
    if (process.env.WEBPACK) {
      const requireContext = require.context('./commands', true, /\.ts$/);
      modules = await Promise.all(requireContext.keys().map(r => requireContext(r)));
    } else {
      modules = await Promise.all(
        fse.readdirSync(resolvePath('./commands')).map(file => import(`./commands/${file}`))
      );
    }

    modules.forEach(mod => {
      const valid = Object.keys(mod).filter(name => /^Command[A-Z].*/.test(name.toString()));
      if (valid.length) this.commands.push(...valid.map(name => new mod[name]()));
    });

    this.commands.sort((a, b) => {
      const cmdA = (Array.isArray(a.cmd) ? a.cmd[0] : a.cmd).toLowerCase();
      const cmdB = (Array.isArray(b.cmd) ? b.cmd[0] : b.cmd).toLowerCase();
      return cmdA < cmdB ? -1 : cmdA > cmdB ? 1 : 0;
    });
  }
}
