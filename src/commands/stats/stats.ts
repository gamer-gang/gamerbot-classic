import axios from 'axios';
import { Message, MessageAttachment } from 'discord.js';
import { Player, PlayerResponse } from 'hypixel-types';
import yaml from 'js-yaml';
import _ from 'lodash';
import yargsParser from 'yargs-parser';
import { Command, CommandDocs } from '..';
import { HypixelPlayer } from '../../entities/HypixelPlayer';
import { client } from '../../providers';
import { Context } from '../../types';
import { codeBlock, Embed } from '../../util';
import { makeBedwarsStats } from './bedwars';

const uuidRegex = /^\b[0-9a-f]{8}\b-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?\b[0-9a-f]{12}\b$/i;
const usernameRegex = /^[A-Za-z0-9_]{3,16}$/;

const statsCache: Record<string, Player> = {};
const uuidCache: Record<string, string> = {};

type Gamemode = 'bedwars';
export type StatsReturn = [image: Buffer, metadata?: (string | boolean)[]];

export class CommandStats implements Command {
  cmd = ['stats', 's'];
  docs: CommandDocs = [
    {
      usage: 'stats <username|uuid> [game] [-q, --quality]',
      description:
        'hypixel stats (game defaults to bedwars)\nif you have a name set, you can use `-` in place (or omit entirely for bedwars)\n`-q` to enable high quality mode',
    },
    {
      usage: 'stats -s, --set-username, <username>',
      description: 'set your username for quicker commands',
    },
    {
      usage: 'stats -g, --get-username [user]',
      description: "get your username (or someone else's)",
    },
    {
      usage: 'stats --clear-username',
      description: 'clear a set username',
    },
  ];

  yargs: yargsParser.Options = {
    alias: { debug: ['d'], 'set-username': ['s'], 'get-username': ['g'], fast: ['f'] },
    boolean: ['debug', 'clear-username', 'fast'],
    string: ['set-username', 'get-username'],
    default: { debug: process.env.NODE_ENV === 'development' },
  };

  readonly gamemodes: Record<Gamemode, (data: Player, quality: boolean) => StatsReturn> = {
    bedwars: (data, quality) => makeBedwarsStats({ data, quality }),
  };

  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;
    const debug = !!args.debug;

    if (args.clearUsername) {
      const entity = await client.em.findOne(HypixelPlayer, { userId: msg.author.id });
      if (!entity) return msg.channel.send(Embed.error(`no username set`));

      client.em.removeAndFlush(entity);

      return msg.channel.send(Embed.success(`cleared username **${entity.hypixelUsername}**`));
    }

    if (args.setUsername != null) {
      if (args.setUsername === '') return msg.channel.send(Embed.error('no username provided'));
      if (!usernameRegex.test(args.setUsername))
        return msg.channel.send(Embed.error('invalid username'));

      const entity = await client.em.findOne(HypixelPlayer, { userId: msg.author.id });
      if (!entity) {
        client.em.persistAndFlush(
          client.em.create(HypixelPlayer, {
            userId: msg.author.id,
            hypixelUsername: args.setUsername,
          })
        );
        return msg.channel.send(
          Embed.success(`set your minecraft username to **${args.setUsername}**`)
        );
      } else {
        const existingUsername = entity.hypixelUsername;
        entity.hypixelUsername = args.setUsername;
        client.em.flush();
        return msg.channel.send(
          Embed.success(
            `set your minecraft username to **${args.setUsername}**`,
            `(overwrote previous username **${existingUsername}**)`
          )
        );
      }
    }

    if (args.getUsername != null) {
      const userId =
        client.users.resolve(args.getUsername)?.id ||
        (args.getUsername as string | undefined) ||
        msg.author.id;

      const displayName = client.users.resolve(userId)?.tag ?? userId;

      const entity = await client.em.findOne(HypixelPlayer, { userId });
      if (!entity)
        return msg.channel.send(
          Embed.warning(
            `no username set for **${displayName}**`,
            'set with `$stats --set-username <username>`'
          )
        );

      return msg.channel.send(
        Embed.info(`username for ${displayName} is set to **${entity.hypixelUsername}**`)
      );
    }

    if (args._.length !== 1 && args._.length !== 2) {
      const entity = await client.em.findOne(HypixelPlayer, { userId: msg.author.id });
      if (!entity) return msg.channel.send(Embed.error('expected 1 or 2 args'));
      args._[0] = entity.hypixelUsername;
    }

    if (args._[0] === '-') {
      const entity = await client.em.findOne(HypixelPlayer, { userId: msg.author.id });
      if (!entity)
        return msg.channel.send(
          Embed.error(
            "you don't have a username set!",
            'set with `$stats --set-username <username>`'
          )
        );

      args._[0] = entity.hypixelUsername;
    }

    const isUuid = uuidRegex.test(args._[0]);
    let uuid = isUuid ? args._[0].replace('-', '') : uuidCache[args._[0].toLowerCase()];

    let loadingMessage: Promise<Message> | undefined = undefined;

    const fetchStart = process.hrtime();

    if (!statsCache[uuid]) {
      loadingMessage = msg.channel.send('fetching data...');

      const response = await axios.get('https://api.hypixel.net/player', {
        params: {
          key: process.env.HYPIXEL_API_KEY,
          uuid: isUuid ? encodeURIComponent(args._[0]) : undefined,
          name: isUuid ? undefined : encodeURIComponent(args._[0]),
        },
      });

      const data = response.data as PlayerResponse;

      if (response.status !== 200 || !data.success)
        return msg.channel.send(Embed.error('request failed', codeBlock(yaml.dump(data), 'yaml')));

      if (!data.player) return msg.channel.send(Embed.error('player does not exist'));

      uuid = data.player.uuid;

      statsCache[uuid] = data.player;
      setTimeout(() => delete statsCache[uuid], 1000 * 60 * 5);

      uuidCache[data.player.playername] = uuid;
      setTimeout(() => delete uuidCache[data.player!.playername], 1000 * 60 * 15);
    }

    const fetchEnd = process.hrtime(fetchStart);
    const fetchDuration = Math.round((fetchEnd![0] * 1e9 + fetchEnd![1]) / 1e6);

    const player = _.cloneDeep(statsCache[uuid]);

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
      const [image, info] = this.gamemodes[exec ? (exec[1] as Gamemode) : 'bedwars'](
        player,
        !args.fast
      );
      const canvasEnd = process.hrtime(canvasStart);
      const canvasDuration = Math.round((canvasEnd![0] * 1e9 + canvasEnd![1]) / 1e6);

      if (!image) throw new Error('invalid state: attatchment is null after regexp exec');

      const file = new MessageAttachment(image);

      const debugInfo = [
        `${fetchDuration < 10 ? 'cached' : `fetch ${fetchDuration}ms`}`,
        `img ${canvasDuration}ms`,
        ...(info?.filter(v => !!v) ?? []),
      ].join('  ');

      await (debug
        ? msg.channel.send({ content: `\`${debugInfo}\``, files: [file] })
        : msg.channel.send(file));
    } catch (err) {
      if ((err.toString() as string).includes('no data'))
        await msg.channel.send(Embed.warning(`${player.playername} has no data for that game`));
      else await msg.channel.send(Embed.error(codeBlock(err)));
    }

    if (loadingMessage) (await loadingMessage).delete();
  }
}
