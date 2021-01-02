import axios from 'axios';
import { Message, TextChannel } from 'discord.js';
import yaml from 'js-yaml';
import _ from 'lodash';
import yargsParser from 'yargs-parser';
import { Command, CommandDocs } from '..';
import { client } from '../../providers';
import { Context } from '../../types';
import { codeBlock, Embed } from '../../util';
import { makeBedwarsStats } from './bedwars';

const uuidRegex = /^\b[0-9a-f]{8}\b-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?\b[0-9a-f]{12}\b$/i;

const statsCache: Record<string, Record<string, unknown>> = {};
const uuidCache: Record<string, string> = {};

export class CommandStats implements Command {
  cmd = 'stats';
  yargs = {} as yargsParser.Options;
  docs: CommandDocs = {
    usage: 'stats <username|uuid> [game]',
    description: 'hypixel stats (game defaults to bedwars)',
  };
  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;
    if (args._.length !== 1 && args._.length !== 2)
      return msg.channel.send(Embed.error('expected 1 or 2 args'));

    const isUuid = uuidRegex.test(args._[0]);
    let uuid = isUuid ? args._[0].replace('-', '') : uuidCache[args._[0].toLowerCase()];

    let message: Promise<Message> | undefined = undefined;

    if (!statsCache[uuid]) {
      message = msg.channel.send('fetching data...');
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

    return this.sendData({
      channel: msg.channel as TextChannel,
      playerData: _.cloneDeep(statsCache[uuid]),
      type: args._[1],
      context,
      message,
    });
  }

  gamemodes: Record<string, (data: Record<string, unknown>) => Buffer> = {
    bedwars: (data: Record<string, unknown>) =>
      makeBedwarsStats({
        data: (data.stats as { Bedwars: HypixelAPI.BedwarsStats }).Bedwars,
        playername: data.displayname as string,
        clientTag: client.user?.tag as string,
      }),
  };

  async sendData({
    channel,
    playerData,
    type,
    context,
    message,
  }: {
    channel: TextChannel;
    playerData: Record<string, unknown>;
    type?: string;
    context: Context;
    message?: Promise<Message>;
  }): Promise<Message | void> {
    let attachment: Buffer;

    try {
      const exec = new RegExp(`(${Object.keys(this.gamemodes).join('|')})`, 'g').exec(
        type?.toLowerCase() ?? ''
      );
      if (!exec && type !== undefined)
        return channel.send(
          Embed.error(
            'invalid game type',
            `supported types: ${codeBlock(Object.keys(this.gamemodes).join('\n'))}`
          )
        );

      // console.time('make image');
      attachment = this.gamemodes[exec ? exec[1] : 'bedwars'](playerData);
      // console.timeEnd('make image');

      if (!attachment) throw new Error('invalid state: attatchment is null after regexp exec');

      const embed = new Embed()
        .setDefaultAuthor()
        .attachFiles([{ attachment, name: 'stats.png' }])
        .setImage('attachment://stats.png');

      context.msg.channel.send(embed);
      if (message) (await message).delete();
    } catch (err) {
      if ((err.toString() as string).includes('no data'))
        channel.send(Embed.warning(`${playerData.playername} has no data for that game`));
      else channel.send(Embed.error(codeBlock(err.stack ? err.stack : err)));
      if (message) (await message).delete();
    }
  }
}
