import axios from 'axios';
import { Message, TextChannel } from 'discord.js';
import yaml from 'js-yaml';
import _ from 'lodash';
import yargsParser from 'yargs-parser';
import { Command, CommandDocs } from '..';
import { Context } from '../../types';
import { codeBlock, Embed } from '../../util';
import { makeBedwarsStats } from './bedwars';

const uuidRegex = /^\b[0-9a-f]{8}\b-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?\b[0-9a-f]{12}\b$/i;

const statsCache: Record<string, Record<string, unknown>> = {};
const uuidCache: Record<string, string> = {};

type Gamemode = 'bedwars';

export class CommandStats implements Command {
  cmd = 'stats';
  docs: CommandDocs = {
    usage: 'stats <username|uuid> [game]',
    description: 'hypixel stats (game defaults to bedwars)',
  };
  yargs: yargsParser.Options = {
    alias: { debug: ['d'] },
    boolean: ['debug'],
  };
  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;
    const debug = !!args.debug;

    if (args._.length !== 1 && args._.length !== 2)
      return msg.channel.send(Embed.error('expected 1 or 2 args'));

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
      duration: Math.round((end![0] * 1e9 + end![1]) / 1e6),
    });
  }

  readonly gamemodes: Record<
    Gamemode,
    (data: Record<string, unknown>) => [image: Buffer, metadata?: string]
  > = {
    bedwars: (data: Record<string, unknown>) =>
      makeBedwarsStats({
        data: (data.stats as { Bedwars: Hypixel.Bedwars }).Bedwars,
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
    playerData: Record<string, unknown>;
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
      else channel.send(Embed.error(codeBlock(err.stack ? err.stack : err)));
      if (loadingMessage) (await loadingMessage).delete();
    }
  }
}
