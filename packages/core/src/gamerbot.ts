import { Embed, findGuild, PresenceManager, resolvePath } from '@gamerbot/util';
import { stripIndent } from 'common-tags';
import {
  Client,
  ClientOptions,
  ClientUser, Guild,
  GuildEmoji,
  Message,
  Snowflake,
  TextBasedChannel
} from 'discord.js';
import fse from 'fs-extra';
import { google } from 'googleapis';
import { getLogger } from 'log4js';
import Spotify from 'spotify-web-api-node';
import { Command } from './commands';
import { CryptoManager } from './commands/crypto/CryptoManager';
import { Queue } from './models/Queue';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GamerbotOptions extends Omit<ClientOptions, 'partials'> {}

export type KnownEmojis =
  | 'success'
  | 'error'
  | 'warn'
  | 'worksonmymachine'
  | 'up_arrow'
  | 'down_arrow';

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

class NonNullableMap<K, V> extends Map<K, V> {
  get(key: K): V {
    return super.get(key) as V;
  }
}

export const migrationMessageLastSent = new Map<string, number>();
export const sendMigrationMessage = async (
  channel: TextBasedChannel
): Promise<Message | undefined> => {
  const guild = findGuild(channel);

  if (!guild) return;

  const lastSent = migrationMessageLastSent.get(guild.id);
  if (lastSent && Date.now() - lastSent < 1000 * 60 * 60 * 24 * 2) return; // send at most once per 2 days

  const embed = new Embed({
    title: 'gamerbot is moving',
    description: stripIndent`
      **gamerbot v2 has been released** and is now available for use in your server!

      Version 1 (this version) will not be receiving any new features or bug fixes, and **service will end on January 1, 2022**.

      **All data (mostly egg data) has already been migrated to v2**, but you will need to re-invite the bot to your server.

      **[Invite v2](https://gamerbot.dev/invite)** · **[v2 Documentation](https://gamerbot.dev/commands)**
    `,
  }).setDefaultAuthor();

  const msg = await channel.send({
    embeds: [embed],
    files: embed.files,
  });

  migrationMessageLastSent.set(guild.id, Date.now());

  return msg;
};

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

  inviteCache = new Map<string, CachedInvite>();
  usernameCache = new Map<string, CachedUsername>();

  /** only safe to access after 'ready' event */
  mediaServer!: Guild;

  private spotifyErrors = -1;
  spotifyTimeouts = [5, 10, 30, 60, 60 * 2, 60 * 5, 60 * 10];
  spotifyDisabled = false;

  readonly queues = new NonNullableMap<string, Queue>();

  constructor(
    opts: GamerbotOptions = {
      intents: [
        'GUILDS',
        'GUILD_MEMBERS',
        'GUILD_BANS',
        'GUILD_EMOJIS_AND_STICKERS',
        'GUILD_INVITES',
        'GUILD_VOICE_STATES',
        'GUILD_MESSAGES',
        'GUILD_MESSAGE_REACTIONS',
        'GUILD_MESSAGE_TYPING',
      ],
    }
  ) {
    super({
      ...(opts as Pick<GamerbotOptions, keyof Omit<ClientOptions, 'partials'>>),
      partials: ['MESSAGE', 'REACTION'],
    });

    const logger = getLogger('Gamerbot#constructor');

    this.presenceManager = new PresenceManager(this);

    this.initCommands();
    this.initSpotify();

    // if (!process.env.HYPIXEL_API_KEY) {
    //   logger.warn('missing hypixel api key! disabling stats support');
    // }

    this.on('ready', () => {
      if (!process.env.MEDIA_SERVER_ID) {
        logger.warn('no media server set! disabling custom emojis');
        return;
      }

      this.mediaServer = this.guilds.cache.get(process.env.MEDIA_SERVER_ID as Snowflake)!;

      const expectedEmojis = ['success', 'error', 'warn', 'up_arrow', 'down_arrow'];
      expectedEmojis.forEach(name => {
        if (!this.getCustomEmoji(name))
          logger.warn(`media server missing '${name}' emoji! using fallback`);
      });

      if (!this.getCustomEmoji('worksonmymachine')) {
        logger.warn(`media server missing 'worksonmymachine' emoji! disabling /techsupport`);
        this.commands.splice(this.commands.findIndex(c => c.name.includes('techsupport')));
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
    const logger = getLogger('Gamerbot#initSpotify');

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
    const logger = { debug: (...args: any[]) => true, warn: (...args: any[]) => true }; // getLogger('Gamerbot#initCommands');

    logger.debug(`starting command discovery`);

    const modules: { [key: string]: any } = {};
    if (process.env.WEBPACK) {
      const requireContext = require.context('./commands', true, /\.ts$/);
      const files = requireContext.keys();
      for (const file of files) {
        logger.debug(`  - discovered file ${file}`);
        if (file.includes('.disabled')) {
          logger.debug('    - skipped because disabled');
          continue;
        }
        modules[file] = await requireContext(file);
      }
    } else {
      const files = fse.readdirSync(resolvePath('./commands'));
      for (const file of files) {
        modules[file] = await import(`./commands/${file}`);
      }
    }

    logger.debug(`imports finished`);
    logger.debug(`beginning export discovery`);

    Object.keys(modules).forEach(key => {
      logger.debug(`processing module ${key}`);
      logger.debug(`  - searching module ${key}`);
      const module = modules[key];
      const exports = Object.keys(module).map(name => name.toString());
      const commandClasses = exports.filter(name => {
        logger.debug(`    - discovered export ${name}`);
        if (/^(User|Message)?Command.+/.test(name)) {
          logger.debug(`      - name looks like possibly a command; adding to list`);
          return true;
        }
        logger.debug(`      - ignoring`);
        return false;
      });

      logger.debug(`  - discovery finished`);

      if (!commandClasses.length) return;

      logger.debug(`  - beginning command verification`);

      for (const command of commandClasses) {
        const instance = new module[command]();
        if (instance.type === 'CHAT_INPUT') {
          logger.debug(`  - testing ${command}`);
          if (!instance.name) {
            logger.warn('       - missing cmd field');
            continue;
          }
          if (!instance.help) {
            logger.warn('       - missing docs field');
            continue;
          }
          if (!instance.execute) {
            logger.warn('       - missing execute method');
            continue;
          }
          if (!instance.data) {
            logger.debug('      - missing data field (continuing anyway)');
          }
          logger.debug(`    - ${command} passed, adding to command list`);
        } else {
          logger.debug(`  - ${command} is not a chat command, skipping verification`);
        }
        this.commands.push(instance);
      }

      logger.debug(`  - verification finished`);
      logger.debug(`done processing ${key}`);
    });

    logger.debug(`sorting commands by name`);
    this.commands.sort((a, b) => {
      const cmdA = a.name[0].toLowerCase();
      const cmdB = b.name[0].toLowerCase();
      return cmdA < cmdB ? -1 : cmdA > cmdB ? 1 : 0;
    });
  }
}
