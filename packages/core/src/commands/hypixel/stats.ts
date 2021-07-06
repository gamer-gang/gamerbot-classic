import axios from 'axios';
import { Image } from 'canvas';
import { Message, MessageAttachment } from 'discord.js';
import { Player } from 'hypixel-types';
import { DateTime } from 'luxon';
import yargsParser from 'yargs-parser';
import { Command, CommandDocs } from '..';
import { HypixelPlayer } from '../../entities/HypixelPlayer';
import { client, getLogger, orm } from '../../providers';
import { Context } from '../../types';
import { codeBlock, Embed, insertUuidDashes, sanitize } from '../../util';
import { makeBedwarsStats } from './bedwars';
import { statsProvider } from './util/cache';

const userRegex =
  /^([A-Za-z0-9_]{3,16}|[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12})$/;

type Gamemode = 'bedwars';
export type StatsData = [image: Buffer, metadata?: (string | boolean)[]];

export class CommandStats implements Command {
  cmd = ['stats', 's'];
  docs: CommandDocs = [
    {
      usage: 'stats <username|uuid> [game] [-f, --fast]',
      description:
        'hypixel stats (game defaults to bedwars)\nif you have a name set, you can use `-` in place (or omit entirely for bedwars)\n`-f` for jpeg',
    },
    {
      usage: 'stats -s, --set-user, <username|uuid>',
      description: 'set your username/uuid for quicker commands',
    },
    {
      usage: 'stats -g, --get-user [user]',
      description: "get your username/uuid (or someone else's)",
    },
    {
      usage: 'stats --clear-user',
      description: 'clear a set username',
    },
    {
      usage: 'stats -i, --info',
      description: 'show user info',
    },
  ];

  yargs: yargsParser.Options = {
    alias: { debug: ['d'], 'set-user': ['s'], 'get-user': ['g'], fast: ['f'], info: ['i'] },
    boolean: ['debug', 'clear-user', 'fast', 'info'],
    string: ['set-user', 'get-user'],
    default: { debug: client.devMode },
  };

  readonly gamemodes: Record<
    Gamemode,
    (data: Player, avatar: Image | undefined, quality: boolean) => StatsData
  > = {
    bedwars: (data, avatar, quality) => makeBedwarsStats(data, avatar, quality),
  };

  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;
    const debug = !!args.debug;

    const timeStart = process.hrtime();

    if (!process.env.HYPIXEL_API_KEY) {
      return Embed.error('Hypixel stats disabled', 'No API key specified in environment').reply(
        msg
      );
    }

    if (args.clearUser) {
      const entity = await orm.em.findOne(HypixelPlayer, { userId: msg.author.id });
      if (!entity) return Embed.error(`No username/UUID set`).reply(msg);

      orm.em.removeAndFlush(entity);

      return Embed.success(`Cleared username/UUID **${entity.hypixelUsername}**`).reply(msg);
    }

    if (args.setUser != null) {
      if (args.setUser === '') return Embed.error('No username/UUID provided').reply(msg);
      if (!userRegex.test(args.setUser)) return Embed.error('Invalid username/UUID').reply(msg);

      const entity = await orm.em.findOne(HypixelPlayer, { userId: msg.author.id });
      if (!entity) {
        orm.em.persistAndFlush(
          orm.em.create(HypixelPlayer, {
            userId: msg.author.id,
            hypixelUsername: args.setUser,
          })
        );
        return Embed.success(`Set your minecraft username/UUID to **${args.setUser}**`).reply(msg);
      } else {
        const existingUsername = entity.hypixelUsername;
        entity.hypixelUsername = args.setUser;
        orm.em.flush();
        return Embed.success(
          `Set your minecraft username/UUID to **${args.setUser}**`,
          `Overwrote previous username/UUID of **${existingUsername}**`
        ).reply(msg);
      }
    }

    if (args.getUser != null) {
      const userId =
        client.users.resolve(args.getUser)?.id ||
        (args.getUser as string | undefined) ||
        msg.author.id;

      const displayName = client.users.resolve(userId)?.tag ?? userId;

      const entity = await orm.em.findOne(HypixelPlayer, { userId });
      if (!entity)
        return Embed.warning(
          `No username/UUID set for **${displayName}**`,
          'Set with `$stats --set-user <username|uuid>`'
        ).reply(msg);

      return Embed.info(
        `Username/UUID for ${displayName} is set to **${entity.hypixelUsername}**`
      ).reply(msg);
    }

    if (args._.length !== 1 && args._.length !== 2) {
      const entity = await orm.em.findOne(HypixelPlayer, { userId: msg.author.id });
      if (!entity) return Embed.error('expected 1 or 2 args').reply(msg);
      args._[0] = entity.hypixelUsername;
    }

    if (args._[0] === '-') {
      const entity = await orm.em.findOne(HypixelPlayer, { userId: msg.author.id });
      if (!entity)
        return Embed.error(
          "You don't have a username set!",
          'set with `$stats --set-user <username|uuid>`'
        ).reply(msg);

      args._[0] = entity.hypixelUsername;
    } else if (/^(<@!?)?\d{18}>?$/.test(args._[0])) {
      const exec = /^(?:<@!?)?(\d{18})>?$/.exec(args._[0]);

      const entity = await orm.em.findOne(HypixelPlayer, { userId: exec && exec[1] });
      if (!entity)
        return Embed.error(`User ${sanitize(args._[0])} doesn't have a username set`).reply(msg);

      args._[0] = entity.hypixelUsername;
    }

    const warnings: string[] = [];
    msg.channel.startTyping();

    const dataStart = process.hrtime();

    let player: Player;

    try {
      const tempPlayer = await statsProvider.get(args._[0]);
      if (!tempPlayer) throw new Error('Player is unexpectedly undefined');
      player = tempPlayer;
    } catch (err) {
      if (err.message.startsWith('% ')) return Embed.error(err.message).reply(msg);
      else throw err;
    }

    const dataEnd = process.hrtime(dataStart);
    const dataDuration = Math.round((dataEnd![0] * 1e9 + dataEnd![1]) / 1e6);

    const avatarSize = 165;

    const avatarStart = process.hrtime();

    const avatar = await axios.get(
      `${process.env.CRAFATAR_URL}/avatars/${player.uuid}?size=${avatarSize}&overlay`,
      { responseType: 'arraybuffer', validateStatus: () => true }
    );

    if (avatar.status >= 500) {
      warnings.push(
        `${client.getCustomEmoji('error')} Avatar error: ${avatar.status} ${avatar.statusText}`
      );
    } else if (!avatar.data) {
      throw new Error(`Avatar fetch failed with no data and status code ${avatar.status}`);
    }

    const avatarEnd = process.hrtime(avatarStart);
    const avatarDuration = Math.round((avatarEnd![0] * 1e9 + avatarEnd![1]) / 1e6);

    if (args.info) {
      const embed = new Embed({ title: player.displayname })
        .addField('UUID', insertUuidDashes(player.uuid))
        .addField(
          'First login',
          player.firstLogin
            ? DateTime.fromMillis(player.firstLogin).toLocaleString(DateTime.DATETIME_FULL)
            : 'Unknown'
        )
        .addField(
          'Last login',
          player.lastLogin
            ? DateTime.fromMillis(player.lastLogin).toLocaleString(DateTime.DATETIME_FULL)
            : 'Unknown'
        );

      if (avatar) {
        embed
          .attachFiles({ attachment: avatar.data, name: 'avatar.png' })
          .setThumbnail('attachment://avatar.png');
      }

      debug &&
        embed.setFooter(
          [
            `${dataDuration < 10 ? 'data cached' : `data ${dataDuration}ms`}`,
            `${avatarDuration < 10 ? 'avatar cached' : `avatar ${avatarDuration}ms`}`,
          ].join('   ')
        );

      embed.reply(msg);
      msg.channel.stopTyping(true);
      return;
    }

    try {
      const exec = new RegExp(`^(${Object.keys(this.gamemodes).join('|')})$`).exec(
        args._[1]?.toLowerCase() ?? ''
      );

      if (!exec && args._[1] !== undefined)
        return Embed.error(
          'Invalid game type',
          `Supported types: ${codeBlock(Object.keys(this.gamemodes).join('\n'))}`
        ).reply(msg);

      const avatarImage = new Image();
      if (avatar) {
        avatarImage.src = avatar.data;
        avatarImage.width = avatarSize;
        avatarImage.height = avatarSize;
      }

      avatarImage.onerror = (err: Error) => {
        getLogger(`STATS ${player.playername}`).error(err);
        throw err;
      };

      const imageStart = process.hrtime();
      const gamemode = exec ? (exec[1] as Gamemode) : 'bedwars';
      const [image, info] = this.gamemodes[gamemode](
        player,
        avatar ? avatarImage : undefined,
        !args.fast
      );
      const imageEnd = process.hrtime(imageStart);
      const imageDuration = Math.round((imageEnd![0] * 1e9 + imageEnd![1]) / 1e6);

      if (!image) throw new Error('Invalid state: attatchment is null after regexp exec');

      const file = new MessageAttachment(image);

      const timeEnd = process.hrtime(timeStart);
      const totalDuration = Math.round((timeEnd![0] * 1e9 + timeEnd![1]) / 1e6);

      const debugInfo = [
        `${dataDuration < 10 ? 'data cached' : `data ${dataDuration}ms`}`,
        `${avatarDuration < 30 ? 'avatar cached' : `avatar ${avatarDuration}ms`}`,
        `${imageDuration < 20 ? 'image cached' : `image ${imageDuration}ms`}`,
        `total ${totalDuration}ms`,
        ...(info?.filter(v => !!v) ?? []),
      ].join('   ');

      const content =
        (warnings.length ? `${warnings.join('\n')}\n` : '') + (debug ? `\`${debugInfo}\`` : '');
      msg.reply({ content: content.length ? content : undefined, files: [file] });

      msg.channel.stopTyping(true);
    } catch (err) {
      if ((err.toString() as string).includes('no data'))
        Embed.info(
          `${player.displayname} has no ${args._[1]?.toLowerCase() ?? 'bedwars'} data`
        ).reply(msg);
      else Embed.error(codeBlock(err)).reply(msg);

      msg.channel.stopTyping(true);
    }
  }
}
