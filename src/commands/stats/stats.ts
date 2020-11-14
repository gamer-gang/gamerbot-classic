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
  yargsSchema = {} as yargsParser.Options;
  docs: CommandDocs = {
    usage: 'stats <username|uuid> [game]',
    description: 'hypixel stats (game defaults to bedwars)',
  };
  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;
    if (args._.length !== 1 && args._.length !== 2)
      return msg.channel.send(Embed.error('expected 1 or 2 args'));

    const isUuid = uuidRegex.test(args._[0]);
    let uuid = isUuid ? args._[0].replace('-', '') : uuidCache[args._[0]];

    if (!statsCache[uuid]) {
      msg.channel.send('fetching data...');
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
    });
  }

  async sendData({
    channel,
    playerData,
    type,
    context,
  }: {
    channel: TextChannel;
    playerData: Record<string, unknown>;
    type: string;
    context: Context;
  }): Promise<Message | void> {
    let attachment: Buffer;

    try {
      const gamemodes = {
        bedwars: () =>
          makeBedwarsStats({
            data: (playerData.stats as { Bedwars }).Bedwars,
            playername: playerData.playername as string,
            clientTag: client.user?.tag as string,
          }),
      } as Record<string, () => Buffer>;

      const exec = new RegExp(`(${Object.keys(gamemodes).join('|')})`, 'gi').exec(type);
      if (!exec && type !== undefined)
        return channel.send(
          Embed.error(
            'invalid game type',
            `supported types: \`\`\`\n${Object.keys(gamemodes).join('\n')}\n\`\`\``
          )
        );

      attachment = gamemodes[exec ? exec[1] : 'bedwars']();

      if (!attachment) throw new Error('invalid state: attatchment is null after regexp exec');

      channel.send(
        new Embed()
          .setDefaultAuthor()
          .setImage('attachment://stats.png')
          .attachFiles([{ attachment, name: 'stats.png' }])
      );
    } catch (err) {
      if ((err.toString() as string).includes('no data'))
        return channel.send(Embed.warning(`${playerData.playername} has no data for that game`));
      return channel.send(Embed.error(codeBlock(err)));
    }
  }
}
