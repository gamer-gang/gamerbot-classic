import { Embed } from '@gamerbot/util';
import { Message, TextChannel } from 'discord.js';
import { getLogger } from 'log4js';
import { Command, CommandDocs, CommandOptions } from '../..';
import { APIMessage, CommandEvent } from '../../../models/CommandEvent';
import { Track } from '../../../models/Track';
import { client } from '../../../providers';
import { getSpotifyAlbum } from './getSpotifyAlbum';
import { getSpotifyPlaylist } from './getSpotifyPlaylist';
import { getSpotifyTrack } from './getSpotifyTrack';
import { getYoutubeChannel } from './getYoutubeChannel';
import { getYoutubePlaylist } from './getYoutubePlaylist';
import { getYoutubeSearch } from './getYoutubeSearch';
import { getYoutubeVideo } from './getYoutubeVideo';

const urlRegexp =
  /^https?:\/\/[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/;

const handlers: {
  [key: string]: [RegExp, (query: string) => Promise<Track[]>];
} = {
  youtubeChannel: [
    /^https?:\/\/(?:www\.|music\.|)youtube\.com\/channel\/([A-Za-z0-9_-]+).*$/,
    getYoutubeChannel,
  ],
  youtubePlaylist: [
    /^https?:\/\/(?:www\.|music\.|)youtube.com\/playlist\?list=([A-Za-z0-9_-]+).*$/,
    getYoutubePlaylist,
  ],
  youtubeVideo: [
    /^https?:\/\/(?:(?:www\.|music\.|)youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+).*$/,
    getYoutubeVideo,
  ],
  spotifyPlaylist: [
    /^(?:https?:\/\/open\.spotify\.com\/playlist\/|spotify:playlist:)([a-zA-Z0-9]+).*$/,
    getSpotifyPlaylist,
  ],
  spotifyAlbum: [
    /^(?:https?:\/\/open\.spotify\.com\/album\/|spotify:album:)([a-zA-Z0-9]+).*$/,
    getSpotifyAlbum,
  ],
  spotifyTrack: [
    /^(?:https?:\/\/open\.spotify\.com\/track\/|spotify:track:)([a-zA-Z0-9]+).*$/,
    getSpotifyTrack,
  ],
};

const sortAliases = {
  newest: ['newest', 'recent'],
  oldest: ['oldest'],
  views: ['views', 'popularity'],
  random: ['random', 'shuffle'],
};

export class CommandPlay extends Command {
  cmd = ['play', 'p'];
  docs: CommandDocs = [
    {
      usage: ['play <url> [--sort <type>]'],
      description:
        'play youtube video from a video/playlist/channel url; must not be private\n' +
        'use --sort to order playlist and channel videos or search results',
    },
    {
      usage: ['play <...searchString>'],
      description: 'search for a video and choose from the top 5 results',
    },
  ];
  commandOptions: CommandOptions = {
    description:
      'Play a Youtube video/playlist/channel, a Spotify track/playlist/album, or search Youtube for a video',
    options: [
      {
        name: 'query',
        description: 'URL or search query',
        type: 'STRING',
        required: true,
      },
    ],
  };
  async execute(event: CommandEvent): Promise<void | Message | APIMessage> {
    const voice = event.guild.members.cache.get(event.user.id)?.voice;
    if (!voice?.channel)
      return event.reply(Embed.error('You are not in a voice channel').ephemeral());
    if (event.guild.me?.voice.channelId && event.guild.me.voice.channelId !== voice.channelId)
      return event.reply(
        Embed.error(
          'You must be in the same voice channel as the bot to use this command'
        ).ephemeral()
      );

    const queue = client.queues.get(event.guild.id);

    const permissions = voice.channel.permissionsFor(client.user.id);
    if (!permissions?.has('CONNECT'))
      return event.reply(Embed.error("Can't connect to that voice channel").ephemeral());
    if (!permissions?.has('SPEAK'))
      return event.reply(Embed.error("Can't speak in that voice channel").ephemeral());

    const query = (event.isInteraction() ? event.options.getString('query') : event.args)?.trim();

    if (!query)
      return event.reply(
        Embed.error(
          'Expected a URL or query',
          event.isMessage() && event.message.attachments.size
            ? `Tip: use ${event.guildConfig.prefix}playfile or /playfile to play an audio file`
            : ''
        ).ephemeral()
      );

    // if (args.sort !== undefined) {
    //   const sort = args.sort.toLowerCase();
    //   const normalizedSort = Object.keys(sortAliases).find(k =>
    //     sortAliases[k].find(keyword => sort === keyword || keyword.includes(sort))
    //   );

    //   if (!normalizedSort)
    //     return Embed.error('Invalid sort type (valid: newest, oldest, views, random)').reply(msg);

    //   args.sort = normalizedSort;
    // }

    // if (queue.paused) {
    //   queue.audioPlayer.unpause();
    //   queue.updateNowPlaying();
    //   msg.react('▶️');
    //   return;
    // }

    // if (!queue.playing && queue.tracks.length) {
    //   queue.index = 0;
    //   return this.playNext(context);
    // }

    queue.textChannel = event.channel as TextChannel;

    await event.defer();

    let tracks: Track[] = [];

    try {
      for (const [name, [regExp, handler]] of Object.entries(handlers)) {
        if (regExp.test(query)) {
          getLogger(`CommandPlay[guild=${event.guild.id}]`).debug(`handling "${query}" as ${name}`);
          tracks = await handler(query);
          break;
        }
      }

      if (!tracks.length) {
        if (urlRegexp.test(query)) return event.editReply(Embed.error('Invalid URL').ephemeral());
        getLogger(`CommandPlay[guild=${event.guild.id}]`).debug(`handling "${query}" as search`);
        tracks = await getYoutubeSearch({ query, event });
      }
    } catch (err) {
      if (err.message.startsWith('% '))
        return event.editReply(Embed.error(err.message.slice(2)).ephemeral());
      else throw err;
    }

    queue.voiceChannel = event.guild.members.resolve(event.user.id)!.voice.channel!;
    const position = queue.queueTracks(tracks, event.user.id) + 1;

    event.editReply(
      Embed.success(
        tracks.length === 1
          ? `Queued **${tracks[0].titleMarkup}** (#${position} in queue)`
          : `Queued ${tracks.length.toString()} tracks (starting at #${position} in queue)`
      )
    );
  }
}
