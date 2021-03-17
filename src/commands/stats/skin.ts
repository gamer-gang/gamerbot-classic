import axios from 'axios';
import { Message } from 'discord.js';
import yargsParser from 'yargs-parser';
import { Command, CommandDocs } from '..';
import { HypixelPlayer } from '../../entities/HypixelPlayer';
import { client, orm } from '../../providers';
import { Context } from '../../types';
import { codeBlock, Embed } from '../../util';
import { statsProvider } from './cache';

const skinTypeAliases = {
  'renders/body': ['body'],
  'renders/head': ['head'],
  avatars: ['2dhead', 'face', 'avatar'],
  skins: ['skin', 'texture'],
};

const skinTypeDisplayNames = {
  'renders/body': 'body',
  'renders/head': 'head',
  avatars: 'avatar',
  skins: 'texture',
};

export class CommandSkin implements Command {
  cmd = 'skin';
  docs: CommandDocs = {
    usage: 'skin [username|uuid]',
    description: 'show minecraft skin (specify --type for types)',
  };
  yargs: yargsParser.Options = {
    alias: { debug: 'd', type: 't', scale: 's' },
    boolean: ['debug'],
    string: ['type'],
    number: ['scale'],
    default: { debug: process.env.NODE_ENV === 'development' },
  };
  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;

    const debug = !!args.debug;

    const timeStart = process.hrtime();

    if (args._.length !== 1) {
      const entity = await orm.em.findOne(HypixelPlayer, { userId: msg.author.id });
      if (!entity) return msg.channel.send(Embed.error('Expected a username or UUID'));
      args._[0] = entity.hypixelUsername;
    }

    if (args._[0] === '-') {
      const entity = await orm.em.findOne(HypixelPlayer, { userId: msg.author.id });
      if (!entity)
        return msg.channel.send(
          Embed.error(
            "You don't have a username set!",
            'set with `$stats --set-user <username|uuid>`'
          )
        );

      args._[0] = entity.hypixelUsername;
    }

    if (args.type !== undefined) {
      if (!args.type)
        return msg.channel.send(Embed.info('Valid types', codeBlock('body\nhead\nface\nskin')));

      const type = args.type.toLowerCase();
      const normalizedType = Object.keys(skinTypeAliases).find(k =>
        skinTypeAliases[k].find(keyword => type === keyword || keyword.includes(type))
      );

      if (!normalizedType)
        return msg.channel.send(Embed.error('Invalid type (valid: body, head, face, skin)'));

      args.type = normalizedType;
    }

    if (args.scale !== undefined) {
      if (args.scale < 1 || args.scale > 10)
        return msg.channel.send(Embed.error('Invalid scale (valid: 1-10)'));
    }

    const warnings: string[] = [];
    msg.channel.startTyping();

    const dataStart = process.hrtime();

    const player = await statsProvider.get(args._[0]);
    if (!player) throw new Error('Player is unexpectedly undefined');

    const dataEnd = process.hrtime(dataStart);
    const dataDuration = Math.round((dataEnd![0] * 1e9 + dataEnd![1]) / 1e6);

    const skinStart = process.hrtime();

    const params = new URLSearchParams();
    params.set('overlay', '');
    args.scale && params.set('scale', args.scale);

    const skin = await axios.get(
      `${process.env.CRAFATAR_URL}/${args.type ?? 'renders/body'}/${
        player.uuid
      }?${params.toString()}`,
      { responseType: 'arraybuffer', validateStatus: () => true }
    );

    if (skin.status >= 500) {
      warnings.push(
        `${client.getCustomEmoji('error')} Skin error: ${skin.status} ${skin.statusText}`
      );
    } else if (!skin.data) {
      throw new Error(`Skin fetch failed with no data and status code ${skin.status}`);
    }

    const skinEnd = process.hrtime(skinStart);
    const skinDuration = Math.round((skinEnd![0] * 1e9 + skinEnd![1]) / 1e6);

    const timeEnd = process.hrtime(timeStart);
    const totalDuration = Math.round((timeEnd![0] * 1e9 + timeEnd![1]) / 1e6);

    const debugInfo = [
      `${dataDuration < 10 ? 'data cached' : `data ${dataDuration}ms`}`,
      `${skinDuration < 30 ? 'skin cached' : `avatar ${skinDuration}ms`}`,
      `total ${totalDuration}ms`,
    ].join('   ');

    const embed = new Embed({
      author: { name: player.displayname },
      title: `Skin (${
        skinTypeDisplayNames[(args.type ?? 'renders/body') as keyof typeof skinTypeDisplayNames]
      })`,
      footer: debug ? { text: debugInfo } : undefined,
    });

    embed.attachFiles([{ name: 'skin.png', attachment: skin.data }]);
    embed.setImage('attachment://skin.png');

    msg.channel.send(embed);
    msg.channel.stopTyping(true);
  }
}
