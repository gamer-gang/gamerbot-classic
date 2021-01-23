import axios from 'axios';
import { Message, TextChannel } from 'discord.js';
import yaml from 'js-yaml';
import _ from 'lodash';
import yargsParser from 'yargs-parser';
import { Command, CommandDocs } from '..';
import { HypixelPlayer } from '../../entities/HypixelPlayer';
import { client } from '../../providers';
import { Context } from '../../types';
import { Hypixel } from '../../types/declarations/hypixel';
import { codeBlock, Embed } from '../../util';
import { makeBedwarsStats } from './bedwars';

const uuidRegex = /^\b[0-9a-f]{8}\b-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?\b[0-9a-f]{12}\b$/i;
const usernameRegex = /^[A-Za-z0-9_]{3,16}$/;

const statsCache: Record<string, Hypixel.Player> = {};
const uuidCache: Record<string, string> = {};

type Gamemode = 'bedwars';

export class CommandStats implements Command {
  cmd = 'stats';
  docs: CommandDocs = [
    {
      usage: 'stats <username|uuid> [game]',
      description:
        'hypixel stats (game defaults to bedwars)\nif you have a name set, you can use `-` in place (or omit entirely for bedwars)',
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
    alias: { debug: ['d'], 'set-username': ['s'], 'get-username': ['g'] },
    boolean: ['debug', 'clear-username'],
    string: ['set-username', 'get-username'],
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

    let start: [number, number];
    debug && (start = process.hrtime());

    if (!statsCache[uuid]) {
      loadingMessage = msg.channel.send('fetching data...');
      // const end = process.hrtime(startTime);
      // ping.edit(`Pong! \`${Math.round((end[0] * 1e9 + end[1]) / 1e6)}ms\``);
      const response = await axios.get('https://api.hypixel.net/player', {
        params: {
          key: process.env.HYPIXEL_API_KEY,
          uuid: isUuid ? encodeURIComponent(args._[0]) : undefined,
          name: isUuid ? undefined : encodeURIComponent(args._[0]),
        },
      });

      const data = _.cloneDeep(response.data);
      if (response.status !== 200 || !data.success) {
        return msg.channel.send(
          Embed.error('request failed', codeBlock(yaml.safeDump(data), 'yaml'))
        );
      } else {
        if (!data.player) return msg.channel.send(Embed.error('player does not exist'));

        uuid = data.player.uuid;
        const { playername } = data.player;

        statsCache[uuid] = _.cloneDeep(data.player);

        setTimeout(() => {
          delete statsCache[uuid];
        }, 1000 * 60 * 5);

        uuidCache[playername] = uuid;
        setTimeout(() => {
          delete uuidCache[playername];
        }, 1000 * 60 * 15);
      }
    }

    let end: [number, number];
    debug && (end = process.hrtime(start!));

    return this.sendData({
      channel: msg.channel as TextChannel,
      playerData: _.cloneDeep(statsCache[uuid]),
      type: args._[1],
      context,
      loadingMessage,
      debug,
      duration: debug ? Math.round((end![0] * 1e9 + end![1]) / 1e6) : undefined,
    });
  }

  readonly gamemodes: Record<
    Gamemode,
    (data: Hypixel.Player) => [image: Buffer, metadata?: string]
  > = {
    bedwars: (data: Hypixel.Player) =>
      makeBedwarsStats({
        data: data.stats.Bedwars,
        playername: data.displayname as string,
      }),
  };

  async sendData({
    channel,
    playerData,
    type,
    context,
    loadingMessage,
    debug,
    duration,
  }: {
    channel: TextChannel;
    playerData: Hypixel.Player;
    type?: string;
    context: Context;
    loadingMessage?: Promise<Message>;
    debug: boolean;
    duration?: number;
  }): Promise<Message | void> {
    try {
      const exec = new RegExp(`^(${Object.keys(this.gamemodes).join('|')})$`).exec(
        type?.toLowerCase() ?? ''
      );
      if (!exec && type !== undefined)
        return channel.send(
          Embed.error(
            'invalid game type',
            `supported types: ${codeBlock(Object.keys(this.gamemodes).join('\n'))}`
          )
        );

      let start: [number, number];
      debug && (start = process.hrtime());
      const [image, info] = this.gamemodes[exec ? (exec[1] as Gamemode) : 'bedwars'](playerData);
      let end: [number, number];
      debug && (end = process.hrtime(start!));

      if (!image) throw new Error('invalid state: attatchment is null after regexp exec');

      const embed = new Embed()
        .setDefaultAuthor()
        .attachFiles([{ attachment: image, name: 'stats.jpeg' }])
        .setImage('attachment://stats.jpeg');

      debug &&
        embed.setFooter(
          [
            `${duration !== undefined && duration < 10 ? 'cached' : `fetch ${duration}ms`}`,
            `img ${Math.round((end![0] * 1e9 + end![1]) / 1e6)}ms `,
            info,
          ].join('  ')
        );

      context.msg.channel.send(embed);
      if (loadingMessage) (await loadingMessage).delete();
    } catch (err) {
      if ((err.toString() as string).includes('no data'))
        channel.send(Embed.warning(`${playerData.playername} has no data for that game`));
      else channel.send(Embed.error(codeBlock(err)));
      if (loadingMessage) (await loadingMessage).delete();
    }
  }
}
