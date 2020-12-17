import { Connection, EntityManager, IDatabaseDriver } from '@mikro-orm/core';
import { Client, ClientOptions, ClientUser } from 'discord.js';
import fse from 'fs-extra';
import YouTube from 'simple-youtube-api';
import Spotify from 'spotify-web-api-node';

import { Command } from './commands';
import { logger } from './providers';
import { GuildQueue } from './types';
import { PresenceManager, resolvePath, Store } from './util';

export interface GamerbotOptions extends Omit<ClientOptions, 'partials'> {
  em: EntityManager<IDatabaseDriver<Connection>>;
}

export class Gamerbot extends Client {
  readonly commands: Command[] = [];
  readonly presenceManager: PresenceManager;
  readonly user!: ClientUser;
  readonly youtube = new YouTube(process.env.YT_API_KEY as string);
  readonly spotify = new Spotify({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  });

  readonly em: GamerbotOptions['em'];
  readonly queues = new Store<GuildQueue>({
    path: 'data/queue.yaml',
    writeOnSet: false,
    readImmediately: false,
    dataLanguage: 'yaml',
  });

  constructor(opts: GamerbotOptions) {
    super({
      ...(opts as Pick<GamerbotOptions, keyof Omit<ClientOptions, 'partials'>>),
      partials: ['MESSAGE', 'REACTION'],
    });

    this.em = opts.em;

    this.presenceManager = new PresenceManager(this);

    this.initCommands();
    this.initSpotify();
  }

  #spotifyTimeouts = [5, 10, 30, 60, 60 * 2, 60 * 5, 60 * 10];
  #spotifyErrors = -1;

  private async initSpotify() {
    try {
      const grant = await this.spotify.clientCredentialsGrant();
      logger.info(`new spotify access token granted, expires in ${grant.body.expires_in} seconds`);
      this.spotify.setAccessToken(grant.body.access_token);
      this.#spotifyErrors = -1;
      setTimeout(this.initSpotify.bind(this), grant.body.expires_in * 1000);
    } catch (err) {
      this.#spotifyErrors++;
      logger.error(err);
      logger.warn(
        `trying to fetch spotify access token again in ${
          this.#spotifyTimeouts[this.#spotifyErrors]
        } seconds`
      );
      setTimeout(this.initSpotify.bind(this), this.#spotifyTimeouts[this.#spotifyErrors] * 1000);
    }
  }

  private async initCommands() {
    let modules: any[];
    if (process.env.WEBPACK) {
      const requireContext = require.context('./commands', true, /\.ts$/);
      modules = await Promise.all(requireContext.keys().map(r => requireContext(r)));
    } else {
      modules = await Promise.all(
        fse.readdirSync(resolvePath('.')).map(file => import(`./commands/${file}`))
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
