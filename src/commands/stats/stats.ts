import axios from 'axios';
import { Message, TextChannel } from 'discord.js';
import yaml from 'js-yaml';
import _ from 'lodash';

import { Command } from '..';
import { client } from '../..';
import { Embed } from '../../embed';
import { CmdArgs } from '../../types';
import { makeBedwarsStats } from './bedwars';

const uuidRegex = /^\b[0-9a-f]{8}\b-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?\b[0-9a-f]{12}\b$/i;

const statsCache: Record<string, Record<string, unknown>> = {};
const uuidCache: Record<string, string> = {};

export class CommandStats implements Command {
  cmd = 'stats';
  docs = {
    usage: 'stats <username|uuid> [game]',
    description: 'hypixel stats (game defaults to bedwars)'
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args } = cmdArgs;
    if (args.length !== 1 && args.length !== 2) return msg.channel.send('expected 1 or 2 args');

    const isUuid = uuidRegex.test(args[0]);
    let uuid = isUuid ? args[0].replace('-', '') : uuidCache[args[0]];

    if (!statsCache[uuid]) {
      msg.channel.send('fetching data...');
      const response = await axios.get('https://api.hypixel.net/player', {
        params: {
          key: process.env.HYPIXEL_API_KEY,
          uuid: isUuid ? encodeURIComponent(args[0]) : undefined,
          name: isUuid ? undefined : encodeURIComponent(args[0])
        }
      });

      const data = _.cloneDeep(response.data);
      if (response.status !== 200 || !data.success) {
        return msg.channel.send('request failed\n```yaml\n' + yaml.safeDump(data) + '\n```');
      } else {
        if (!data.player) return msg.channel.send('player does not exist');

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
      type: args[1],
      cmdArgs
    });
  }

  async sendData({
    channel,
    playerData,
    type,
    cmdArgs
  }: {
    channel: TextChannel;
    playerData: Record<string, unknown>;
    type: string;
    cmdArgs: CmdArgs;
  }): Promise<Message | void> {
    let attachment: Buffer;

    try {
      const gamemodes = {
        bedwars: () =>
          makeBedwarsStats({
            data: (playerData.stats as { Bedwars }).Bedwars,
            playername: playerData.playername as string,
            clientTag: client.user?.tag as string
          })
      } as Record<string, () => Buffer>;

      const exec = new RegExp(`(${Object.keys(gamemodes).join('|')})`, 'gi').exec(type);
      if (!exec && type !== undefined)
        return channel.send(
          'invalid game type, supported types: ' + Object.keys(gamemodes).join(', ')
        );

      attachment = gamemodes[exec ? exec[1] : 'bedwars']();

      if (!attachment) throw new Error('invalid state: attatchment is null after regexp exec');

      channel.send(
        new Embed()
          .setImage('attachment://stats.png')
          .attachFiles([{ attachment, name: 'stats.png' }])
      );
    } catch (err) {
      if ((err.toString() as string).includes('no data'))
        return channel.send('player has no data for that game');
      return channel.send(`error: \`\`\`${err}\n\n${err.stack}\`\`\``);
    }
  }
}
