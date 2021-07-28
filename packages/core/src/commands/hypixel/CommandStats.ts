import { codeBlock, Embed, insertUuidDashes } from '@gamerbot/util';
import axios from 'axios';
import { Image } from 'canvas';
import { Message, MessageAttachment } from 'discord.js';
import { Player } from 'hypixel-types';
import { getLogger } from 'log4js';
import { DateTime } from 'luxon';
import { Command, CommandDocs, CommandOptions } from '..';
import { HypixelPlayer } from '../../entities/HypixelPlayer';
import { CommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';
import { makeBedwarsStats } from './makeBedwarsStats';
import { statsProvider } from './util/cache';
import { getNetworkLevel } from './util/leveling';

const userRegex =
  /^([A-Za-z0-9_]{3,16}|[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12})$/;

type Gamemode = 'bedwars';
export type StatsData = [image: Buffer, metadata?: (string | boolean)[]];

export class CommandStats extends Command {
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
  commandOptions: CommandOptions = {
    description: 'Show Hypixel stats',
    options: [
      {
        name: 'set-username',
        description: 'Set your Minecraft username',
        type: 'SUB_COMMAND',
        options: [
          {
            name: 'new-username',
            description: 'Minecraft username',
            type: 'STRING',
            required: true,
          },
        ],
      },
      {
        name: 'find-username',
        description: "Get your (or someone else's) Minecraft username",
        type: 'SUB_COMMAND',
        options: [
          {
            name: 'user',
            description: 'User to check name for (leave blank for your own)',
            type: 'USER',
          },
        ],
      },
      {
        name: 'clear-username',
        description: 'Reset your Minecraft username',
        type: 'SUB_COMMAND',
      },
      {
        name: 'get',
        description: 'Get stats from API',
        type: 'SUB_COMMAND',
        options: [
          {
            name: 'gamemode',
            description: 'Hypixel gamemode to show stats (leave blank for bedwars)',
            type: 'STRING',
            choices: [
              { name: 'bedwars', value: 'bedwars' },
              { name: 'network stats', value: 'network' },
            ],
          },
          {
            name: 'username',
            description: 'Minecraft username of player (leave blank or enter `-` for your own',
            type: 'STRING',
          },
        ],
      },
    ],
  };
  // yargs: yargsParser.Options = {
  //   alias: { debug: ['d'], 'set-user': ['s'], 'get-user': ['g'], fast: ['f'], info: ['i'] },
  //   boolean: ['debug', 'clear-user', 'fast', 'info'],
  //   string: ['set-user', 'get-user'],
  //   default: { debug: client.devMode },
  // };

  // readonly gamemodes: Record<
  //   Gamemode,
  //   (data: Player, avatar: Image | undefined, ) => StatsData
  // > = {
  //   bedwars: (data, avatar, quality) => makeBedwarsStats(data, avatar),
  // };

  async execute(event: CommandEvent): Promise<void | Message> {
    const debug = client.devMode; // !!args.debug;

    const timeStart = process.hrtime();

    const subcommand =
      (event.isInteraction() ? event.options.getSubCommand() : event.argv[0]) ?? 'get';

    if (
      subcommand !== 'find-username' &&
      subcommand !== 'set-username' &&
      subcommand !== 'clear-username' &&
      subcommand !== 'get'
    )
      return event.reply(
        Embed.error(
          'Invalid subcommand',
          'Valid commands: find-username, set-username, clear-username, get'
        )
      );

    if (!process.env.HYPIXEL_API_KEY) {
      return event.reply(
        Embed.error('Hypixel stats disabled', 'No API key specified in environment').ephemeral()
      );
    }

    if (subcommand === 'clear-username') {
      const entity = await event.em.findOne(HypixelPlayer, { userId: event.user.id });
      if (!entity) return event.reply(Embed.error(`No username/UUID set`).ephemeral());

      event.em.removeAndFlush(entity);

      return event.reply(Embed.success(`Cleared username/UUID **${entity.hypixelUsername}**`));
    } else if (subcommand === 'set-username') {
      const username = event.isInteraction()
        ? event.options.getString('new-username')
        : event.argv[1];
      if (!username) return event.reply(Embed.error('No username/UUID provided').ephemeral());
      if (!userRegex.test(username))
        return event.reply(Embed.error('Invalid username/UUID').ephemeral());

      const entity = await event.em.findOne(HypixelPlayer, { userId: event.user.id });
      if (!entity) {
        event.em.persistAndFlush(
          event.em.create(HypixelPlayer, {
            userId: event.user.id,
            hypixelUsername: username,
          })
        );
        return event.reply(Embed.success(`Set your minecraft username/UUID to **${username}**`));
      } else {
        const existingUsername = entity.hypixelUsername;
        entity.hypixelUsername = username;
        event.em.flush();
        return event.reply(
          Embed.success(
            `Set your minecraft username/UUID to **${username}**`,
            `Overwrote previous username/UUID of **${existingUsername}**`
          )
        );
      }
    } else if (subcommand === 'find-username') {
      const user = event.isInteraction() ? event.options.getUser('get-user') : event.argv[1];

      const userId = client.users.resolve(user as any)?.id || user || event.user.id;

      const displayName = client.users.resolve(userId)?.tag ?? userId;

      const entity = await event.em.findOne(HypixelPlayer, { userId });
      if (!entity)
        return event.reply(
          Embed.info(
            `No username/UUID set for **${displayName}**`,
            userId === event.user.id ? undefined : 'Set with `$stats --set-user <username|uuid>`'
          )
        );

      return event.reply(
        Embed.info(`Username/UUID for ${displayName} is set to **${entity.hypixelUsername}**`)
      );
    }

    const gamemode =
      (event.isInteraction() ? event.options.getString('gamemode') : event.argv[1]) ?? 'bedwars';

    if (gamemode !== 'bedwars' && gamemode !== 'network')
      return event.reply(
        Embed.error('Invalid gamemode', 'Valid options: bedwars, network').ephemeral()
      );

    let username = event.isInteraction() ? event.options.getString('username') : event.argv[2];

    if (!username) {
      const entity = await event.em.findOne(HypixelPlayer, { userId: event.user.id });
      if (!entity)
        return event.reply(
          Embed.error(
            'Expected a username',
            `Pro tip: use \`${event.guildConfig.prefix}stats set-username <username|uuid>\` to skip typing your username every time time`
          ).ephemeral()
        );
      username = entity.hypixelUsername;
    }

    if (username === '-') {
      const entity = await event.em.findOne(HypixelPlayer, { userId: event.user.id });
      if (!entity)
        return event.reply(
          Embed.error(
            "You don't have a username set!",
            `set with \`${event.guildConfig.prefix}stats set-username <username|uuid>\``
          )
        );

      username = entity.hypixelUsername;
    }

    await event.defer();

    const warnings: string[] = [];

    const dataStart = process.hrtime();

    let player: Player;

    try {
      const tempPlayer = await statsProvider.get(username);
      if (!tempPlayer) throw new Error('Player is unexpectedly undefined');
      player = tempPlayer;
    } catch (err) {
      if (err.message.startsWith('% '))
        return event.reply(Embed.error(err.message.slice(2)).ephemeral());
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

    if (gamemode === 'network') {
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
        )
        .addField('Network level', getNetworkLevel(player.networkExp).toFixed(2));

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

      event.editReply(embed);
      return;
    }

    try {
      // const exec = new RegExp(`^(${Object.keys(this.gamemodes).join('|')})$`).exec(
      //   args._[1]?.toLowerCase() ?? ''
      // );

      // if (!exec && args._[1] !== undefined)
      //   return Embed.error(
      //     'Invalid game type',
      //     `Supported types: ${codeBlock(Object.keys(this.gamemodes).join('\n'))}`
      //   ).reply(msg);

      const avatarImage = new Image();
      if (avatar) {
        avatarImage.src = avatar.data;
        avatarImage.width = avatarSize;
        avatarImage.height = avatarSize;
      }

      avatarImage.onerror = (err: Error) => {
        getLogger(`CommandStats[player=${player.playername}]`).error(err);
        throw err;
      };

      const imageStart = process.hrtime();
      const [image, info] = makeBedwarsStats(player, avatar ? avatarImage : undefined);
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
      event.editReply({ content: content.length ? content : undefined, files: [file] });
    } catch (err) {
      if ((err.toString() as string).includes('no data'))
        event.editReply(Embed.info(`${player.displayname} has no ${gamemode} data`));
      else event.editReply(Embed.error(codeBlock(err)).ephemeral());
    }
  }
}
