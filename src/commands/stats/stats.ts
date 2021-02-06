import { RequestContext } from '@mikro-orm/core';
import axios from 'axios';
import { Message, MessageAttachment } from 'discord.js';
import { Player, PlayerResponse } from 'hypixel-types';
import yaml from 'js-yaml';
import _ from 'lodash';
import moment from 'moment';
import yargsParser from 'yargs-parser';
import { Command, CommandDocs } from '..';
import { HypixelPlayer } from '../../entities/HypixelPlayer';
import { client } from '../../providers';
import { Context } from '../../types';
import { codeBlock, Embed } from '../../util';
import { makeBedwarsStats } from './bedwars';

const uuidRegex = /^\b[0-9a-f]{8}\b-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?\b[0-9a-f]{12}\b$/i;
const userRegex = /^([A-Za-z0-9_]{3,16}|[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12})$/;

const insertUuidDashes = (uuid: string) =>
  `${uuid.slice(0, 8)}-${uuid.slice(8, 12)}-${uuid.slice(12, 16)}-${uuid.slice(
    16,
    20
  )}-${uuid.slice(20, 32)}`;

const statsCache = new Map<string, Player>();
const uuidCache = new Map<string, string>();
const avatarCache = new Map<string, Buffer>();

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
    default: { debug: process.env.NODE_ENV === 'development' },
  };

  readonly gamemodes: Record<Gamemode, (data: Player, quality: boolean) => StatsData> = {
    bedwars: (data, quality) => makeBedwarsStats(data, quality),
  };

  async execute(context: Context): Promise<void | Message> {
    const em = RequestContext.getEntityManager() ?? client.em;

    const { msg, args } = context;
    const debug = !!args.debug;

    if (args.clearUser) {
      const entity = await em.findOne(HypixelPlayer, { userId: msg.author.id });
      if (!entity) return msg.channel.send(Embed.error(`no username/uuid set`));

      em.removeAndFlush(entity);

      return msg.channel.send(Embed.success(`cleared username/uuid **${entity.hypixelUsername}**`));
    }

    if (args.setUser != null) {
      if (args.setUser === '') return msg.channel.send(Embed.error('no username/uuid provided'));
      if (!userRegex.test(args.setUser))
        return msg.channel.send(Embed.error('invalid username/uuid'));

      const entity = await em.findOne(HypixelPlayer, { userId: msg.author.id });
      if (!entity) {
        em.persistAndFlush(
          em.create(HypixelPlayer, {
            userId: msg.author.id,
            hypixelUsername: args.setUser,
          })
        );
        return msg.channel.send(
          Embed.success(`set your minecraft username/uuid to **${args.setUser}**`)
        );
      } else {
        const existingUsername = entity.hypixelUsername;
        entity.hypixelUsername = args.setUser;
        em.flush();
        return msg.channel.send(
          Embed.success(
            `set your minecraft username/uuid to **${args.setUser}**`,
            `(overwrote previous username/uuid of **${existingUsername}**)`
          )
        );
      }
    }

    if (args.getUser != null) {
      const userId =
        client.users.resolve(args.getUser)?.id ||
        (args.getUser as string | undefined) ||
        msg.author.id;

      const displayName = client.users.resolve(userId)?.tag ?? userId;

      const entity = await em.findOne(HypixelPlayer, { userId });
      if (!entity)
        return msg.channel.send(
          Embed.warning(
            `no username/uuid set for **${displayName}**`,
            'set with `$stats --set-user <username|uuid>`'
          )
        );

      return msg.channel.send(
        Embed.info(`username/uuid for ${displayName} is set to **${entity.hypixelUsername}**`)
      );
    }

    if (args._.length !== 1 && args._.length !== 2) {
      const entity = await em.findOne(HypixelPlayer, { userId: msg.author.id });
      if (!entity) return msg.channel.send(Embed.error('expected 1 or 2 args'));
      args._[0] = entity.hypixelUsername;
    }

    if (args._[0] === '-') {
      const entity = await em.findOne(HypixelPlayer, { userId: msg.author.id });
      if (!entity)
        return msg.channel.send(
          Embed.error(
            "you don't have a username set!",
            'set with `$stats --set-user <username|uuid>`'
          )
        );

      args._[0] = entity.hypixelUsername;
    }

    msg.channel.startTyping();

    const isUuid = uuidRegex.test(args._[0]);
    let uuid = (isUuid ? args._[0] : uuidCache.get(args._[0].toLowerCase()))?.replace(/-/g, '');

    const dataStart = process.hrtime();

    if (!statsCache.has(uuid ?? '')) {
      const response = await axios.get('https://api.hypixel.net/player', {
        params: {
          key: process.env.HYPIXEL_API_KEY,
          uuid: isUuid ? encodeURIComponent(args._[0]) : undefined,
          name: isUuid ? undefined : encodeURIComponent(args._[0]),
        },
      });

      const data = response.data as PlayerResponse;

      if (response.status !== 200 || !data.success)
        return msg.channel.send(
          Embed.error(
            'Request failed: ' + response.statusText,
            data ? codeBlock(yaml.dump(data), 'yaml') : ''
          )
        );

      if (!data.player) return msg.channel.send(Embed.error('Player does not exist'));

      uuid = data.player.uuid;

      statsCache.set(uuid, data.player);
      setTimeout(() => statsCache.delete(uuid!), 1000 * 60 * 5);

      uuidCache.set(data.player.playername, uuid);
      setTimeout(() => uuidCache.delete(data.player!.playername), 1000 * 60 * 15);
    }

    const dataEnd = process.hrtime(dataStart);
    const dataDuration = Math.round((dataEnd![0] * 1e9 + dataEnd![1]) / 1e6);

    const player = _.cloneDeep(statsCache.get(uuid!));
    if (!player) throw new Error("Player is undefined after checking that it isn't");

    if (args.info) {
      const avatarStart = process.hrtime();
      if (!avatarCache.has(uuid!)) {
        const avatar = await axios.get(`https://crafatar.com/avatars/${player.uuid}`, {
          responseType: 'arraybuffer',
        });
        avatarCache.set(uuid!, Buffer.from(avatar.data));
        setTimeout(() => avatarCache.delete(uuid!), 1000 * 60 * 15);
      }

      const avatar = avatarCache.get(uuid!);
      if (!avatar) throw new Error("Avatar is undefined after checking that it isn't");

      const avatarEnd = process.hrtime(avatarStart);
      const avatarDuration = Math.round((avatarEnd![0] * 1e9 + avatarEnd![1]) / 1e6);

      const formatString = 'dddd, MMMM Do YYYY, h:mm:ss A [UTC]Z';

      const embed = new Embed({ title: player.displayname })
        .addField('UUID', insertUuidDashes(player.uuid))
        .addField('First login', moment(player.firstLogin).format(formatString))
        .addField('Last login', moment(player.lastLogin).format(formatString))
        .attachFiles([{ attachment: avatar, name: 'avatar.png' }])
        .setThumbnail('attachment://avatar.png');

      debug &&
        embed.setFooter(
          [
            `${dataDuration < 10 ? 'data cached' : `data ${dataDuration}ms`}`,
            `${avatarDuration < 10 ? 'avatar cached' : `avatar ${avatarDuration}ms`}`,
          ].join('   ')
        );

      msg.channel.send(embed);
      msg.channel.stopTyping();
      return;
    }

    try {
      const exec = new RegExp(`^(${Object.keys(this.gamemodes).join('|')})$`).exec(
        args._[1]?.toLowerCase() ?? ''
      );

      if (!exec && args._[1] !== undefined)
        return msg.channel.send(
          Embed.error(
            'invalid game type',
            `supported types: ${codeBlock(Object.keys(this.gamemodes).join('\n'))}`
          )
        );

      const canvasStart = process.hrtime();
      const gamemode = exec ? (exec[1] as Gamemode) : 'bedwars';
      const [image, info] = this.gamemodes[gamemode](player, !args.fast);
      const canvasEnd = process.hrtime(canvasStart);
      const canvasDuration = Math.round((canvasEnd![0] * 1e9 + canvasEnd![1]) / 1e6);

      if (!image) throw new Error('invalid state: attatchment is null after regexp exec');

      const file = new MessageAttachment(image);

      const debugInfo = [
        `${dataDuration < 10 ? 'data cached' : `data ${dataDuration}ms`}`,
        `img ${canvasDuration}ms`,
        ...(info?.filter(v => !!v) ?? []),
      ].join('   ');

      await (debug
        ? msg.channel.send({ content: `\`${debugInfo}\``, files: [file] })
        : msg.channel.send(file));
    } catch (err) {
      if ((err.toString() as string).includes('no data'))
        await msg.channel.send(
          Embed.warning(
            `${player.displayname} has no ${args._[1]?.toLowerCase() ?? 'bedwars'} data`
          )
        );
      else await msg.channel.send(Embed.error(codeBlock(err)));
    }

    msg.channel.stopTyping();
  }
}
