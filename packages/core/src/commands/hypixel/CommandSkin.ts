import { codeBlock } from '@discordjs/builders';
import { Embed } from '@gamerbot/util';
import axios, { AxiosRequestConfig } from 'axios';
import { Message } from 'discord.js';
import { HypixelCacheResponse } from 'hypixel-cache';
import { Player } from 'hypixel-types';
import { ChatCommand, CommandDocs, CommandOptions } from '..';
import { HypixelPlayer } from '../../entities/HypixelPlayer';
import { APIMessage, CommandEvent } from '../../models/CommandEvent';
import { client, getORM } from '../../providers';

const userRegex = /^[A-Za-z0-9_]{3,16}$/;
const uuidRegex = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

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

export class CommandSkin extends ChatCommand {
  name = ['skin'];
  help: CommandDocs = [
    {
      usage: 'skin [username|uuid]',
      description: 'show minecraft skin (specify --type for types)',
    },
  ];
  data: CommandOptions = {
    description: 'Get Minecraft skins',
    options: [
      {
        name: 'username',
        description: 'Username or UUID of player',
        type: 'STRING',
      },
    ],
  };
  async execute(event: CommandEvent): Promise<void | Message | APIMessage> {
    const debug = client.devMode; // !!args.debug;
    const orm = await getORM();

    const timeStart = process.hrtime();

    let providedName = event.isInteraction()
      ? event.interaction.options.getString('username')?.trim()
      : event.argv[0]?.trim();

    if (!providedName) {
      const entity = await orm.em.findOne(HypixelPlayer, { userId: event.user.id });
      if (!entity) return event.reply(Embed.error('Expected a username or UUID').ephemeral());
      providedName = entity.hypixelUsername;
    }

    if (providedName === '-') {
      const entity = await orm.em.findOne(HypixelPlayer, { userId: event.user.id });
      if (!entity)
        return event.reply(
          Embed.error(
            "You don't have a username set!",
            'set with `/stats username set <username|uuid>`'
          ).ephemeral()
        );

      providedName = entity.hypixelUsername;
    }

    await event.deferReply();

    // if (args.type !== undefined) {
    //   if (!args.type)
    //     return Embed.info('Valid types', codeBlock('body\nhead\nface\nskin')).reply(msg);

    //   const type = args.type.toLowerCase();
    //   const normalizedType = Object.keys(skinTypeAliases).find(k =>
    //     skinTypeAliases[k].find(keyword => type === keyword || keyword.includes(type))
    //   );

    //   if (!normalizedType)
    //     return Embed.error('Invalid type (valid: body, head, face, skin)').reply(msg);

    //   args.type = normalizedType;
    // }

    // if (args.scale !== undefined) {
    //   if (args.scale < 1 || args.scale > 10)
    //     return Embed.error('Invalid scale (valid: 1-10)').reply(msg);
    // }

    const warnings: string[] = [];

    const dataStart = process.hrtime();

    let player: Player;
    try {
      const type = uuidRegex.test(providedName) ? 'uuid' : 'name';
      const response = await axios.get(`${process.env.HYPIXEL_CACHE_URL}/${type}/${providedName}`, {
        headers: { 'X-Secret': process.env.HYPIXEL_CACHE_SECRET },
        validateStatus: () => true,
      });

      const data = response.data as HypixelCacheResponse;

      if (response.status === 429) throw new Error('% Ratelimited, try again later');
      if (!data.success) throw new Error('% ' + data.error);

      ({ player } = data);
    } catch (err) {
      if (err.message.startsWith('% '))
        return event.editReply(Embed.error(err.message.slice(2)).ephemeral());
      else throw err;
    }
    if (!player) throw new Error('Player is unexpectedly undefined');

    const dataEnd = process.hrtime(dataStart);
    const dataDuration = Math.round((dataEnd![0] * 1e9 + dataEnd![1]) / 1e6);

    const skinStart = process.hrtime();

    const params = new URLSearchParams();
    params.set('overlay', '');
    // args.scale && params.set('scale', args.scale);

    const options: AxiosRequestConfig = {
      responseType: 'arraybuffer',
      validateStatus: () => true,
    };

    const visage = `https://visage.surgeplay.com/full/${player.uuid}`;
    const crafatar = `${process.env.CRAFATAR_URL}/renders/body/${player.uuid}?${params.toString()}`;

    let skin = await axios.get(visage, options);

    // fall back to crafatar if visage errors
    if (skin.status >= 500) skin = await axios.get(crafatar, options);

    if (skin.status >= 500) {
      warnings.push(
        `${client.getCustomEmoji('error')} Skin error: ${skin.status} ${skin.statusText}`
      );
    } else if (skin.status >= 400) {
      return event.editReply(
        Embed.error(
          `Skin fetch failed with status code ${skin.status}`,
          codeBlock(skin.data.toString())
        )
      );
    } else if (!skin.data) {
      return event.editReply(
        Embed.error(`Skin fetch failed with no data and status code ${skin.status}`).ephemeral()
      );
    }

    const skinEnd = process.hrtime(skinStart);
    const skinDuration = Math.round((skinEnd![0] * 1e9 + skinEnd![1]) / 1e6);

    const timeEnd = process.hrtime(timeStart);
    const totalDuration = Math.round((timeEnd![0] * 1e9 + timeEnd![1]) / 1e6);

    const debugInfo = [
      `${dataDuration < 10 ? 'data cached' : `data ${dataDuration}ms`}`,
      `${skinDuration < 30 ? 'skin cached' : `skin ${skinDuration}ms`}`,
      `total ${totalDuration}ms`,
    ].join('   ');

    const embed = new Embed({
      author: { name: player.displayname },
      title: `Skin (${
        skinTypeDisplayNames[/* args.type ?? */ 'renders/body' as keyof typeof skinTypeDisplayNames]
      })`,
      footer: debug ? { text: debugInfo } : undefined,
      image: { url: 'attachment://skin.png' },
    }).attachFiles({ name: 'skin.png', attachment: skin.data });

    event.editReply(embed);
  }
}
